/**
 * Customer Self-Service Routes (/api/me/*)
 * Strictly scoped to authenticated wristband ID using least-privilege customerPool.
 * Never exposes raw tables, other visitors' data, or admin operations.
 */

const express = require('express');
const router = express.Router();
const { customerPool, trackedQuery } = require('../config/db');
const { verifyCustomer } = require('../middleware/auth');
const { formatDatabaseError } = require('../utils/dbErrorHandler');
const { broadcastEvent } = require('./events');

// Enforce customer authentication on all /api/me/* endpoints
router.use(verifyCustomer);

// ==========================================
// 1. CUSTOMER DASHBOARD
// ==========================================
router.get('/dashboard', async (req, res) => {
    const { bandId, visitorId } = req.user;

    try {
        // Wristband status & balance
        const [bandRows] = await trackedQuery(
            customerPool,
            `SELECT Band_ID, Band_UID, Wallet_Balance, Status 
             FROM RFID_Wristband 
             WHERE Band_ID = ?`,
            [bandId],
            'Customer Dashboard: Wristband'
        );

        // Active Queue Passes
        const [passes] = await trackedQuery(
            customerPool,
            `SELECT * FROM Vw_My_Pass_Details 
             WHERE Band_ID = ? AND Status = 'Booked' 
             ORDER BY Slot_Start_Time ASC`,
            [bandId],
            'Customer Dashboard: Active Passes'
        );

        // Active Locker Rental
        const [lockers] = await trackedQuery(
            customerPool,
            `SELECT 
                r.Rental_ID, 
                r.Locker_ID, 
                l.Zone, 
                l.Number, 
                r.Rental_Start_Time, 
                r.Status
             FROM Locker_Rental r
             JOIN Locker l ON r.Locker_ID = l.Locker_ID
             WHERE r.Band_ID = ? AND r.Status = 'Active'`,
            [bandId],
            'Customer Dashboard: Active Locker'
        );

        // Recent 3 wallet transactions
        const [recentTxns] = await trackedQuery(
            customerPool,
            `SELECT 
                t.Transaction_ID,
                t.Transaction_Type,
                t.Amount,
                t.Closing_Balance,
                t.Transaction_Time,
                o.Outlet_Name
             FROM Wallet_Transaction t
             LEFT JOIN POS_Outlet o ON t.Outlet_ID = o.Outlet_ID
             WHERE t.Band_ID = ?
             ORDER BY t.Transaction_Time DESC
             LIMIT 3`,
            [bandId],
            'Customer Dashboard: Recent Txns'
        );

        return res.json({
            success: true,
            user: {
                ...req.user,
                bandUid: bandRows[0]?.Band_UID || req.user.bandUid,
                walletBalance: parseFloat(bandRows[0]?.Wallet_Balance || 0),
                status: bandRows[0]?.Status || 'Active'
            },
            activePasses: passes,
            activeLocker: lockers.length > 0 ? lockers[0] : null,
            recentTransactions: recentTxns
        });

    } catch (err) {
        console.error('Customer dashboard error:', err);
        return res.status(500).json(formatDatabaseError(err));
    }
});

// ==========================================
// 1B. REPORT WRISTBAND LOST (WATER PARK PROTECTION)
// ==========================================
router.post('/wristband/report-lost', async (req, res) => {
    const { bandId, visitorId, fullName } = req.user;

    try {
        await customerPool.query(
            `UPDATE RFID_Wristband SET Status = 'Lost' WHERE Band_ID = ?`,
            [bandId]
        );

        // Audit log
        await customerPool.query(
            `INSERT INTO Park_Audit_Log (Event_Type, Band_ID, Reference_ID, Description, Logged_At)
             VALUES ('Wristband_Status', ?, ?, CONCAT('Visitor reported RFID band lost in water park / slide area: ', ?), NOW())`,
            [bandId, visitorId, fullName]
        );

        broadcastEvent('wristband_reported_lost', {
            bandId,
            visitorId,
            fullName,
            timestamp: new Date().toISOString()
        });

        return res.json({
            success: true,
            message: 'Your RFID wristband has been reported LOST and instantly frozen. All wallet auto-debits and locker access are secured. Please report to Guest Relations Counter #1 to receive a replacement physical wristband.'
        });
    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

// ==========================================
// 2. RIDES & SAFETY HEIGHT ELIGIBILITY
// ==========================================
router.get('/rides', async (req, res) => {
    const { bandId, heightCm } = req.user;

    try {
        const [rides] = await trackedQuery(
            customerPool,
            `SELECT * FROM Vw_Attraction_Live_Load ORDER BY Attraction_ID ASC`,
            [],
            'Customer Rides: Load All'
        );

        // User's booked passes
        const [bookedPasses] = await trackedQuery(
            customerPool,
            `SELECT Attraction_ID, Pass_ID, Slot_Start_Time, Slot_End_Time 
             FROM Virtual_Queue_Pass 
             WHERE Band_ID = ? AND Status = 'Booked'`,
            [bandId],
            'Customer Rides: Booked Passes'
        );

        const bookedMap = new Map();
        bookedPasses.forEach(p => bookedMap.set(p.Attraction_ID, p));

        // Augment each ride with personalized height eligibility & active pass info
        const enrichedRides = rides.map(ride => {
            const minH = parseFloat(ride.Min_Height_cm);
            const maxH = parseFloat(ride.Max_Height_cm);
            const userH = parseFloat(heightCm);

            let isEligible = true;
            let eligibilityReason = `Eligible! Your height (${userH} cm) is within safety requirements (${minH}-${maxH} cm).`;

            if (userH < minH) {
                isEligible = false;
                const diff = (minH - userH).toFixed(1);
                eligibilityReason = `Too short: You need ${diff} cm more (Minimum ${minH} cm, you are ${userH} cm).`;
            } else if (userH > maxH) {
                isEligible = false;
                const diff = (userH - maxH).toFixed(1);
                eligibilityReason = `Too tall: Exceeds maximum allowance by ${diff} cm (Maximum ${maxH} cm).`;
            }

            return {
                ...ride,
                userHeight: userH,
                isEligible,
                eligibilityReason,
                hasActivePass: bookedMap.has(ride.Attraction_ID),
                activePass: bookedMap.get(ride.Attraction_ID) || null
            };
        });

        return res.json({ success: true, rides: enrichedRides });

    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

// ==========================================
// 3. VIRTUAL QUEUE (FASTPASS) BOOKING
// ==========================================
router.post('/queue/book', async (req, res) => {
    const { bandId } = req.user;
    const { attractionId, slotStartTime, slotEndTime } = req.body;

    if (!attractionId || !slotStartTime || !slotEndTime) {
        return res.status(400).json({ error: true, message: 'Attraction and time slot are required.' });
    }

    try {
        // Call sp_book_queue_pass stored procedure
        // The trigger trg_no_overlapping_queue_pass will reject if overlapping
        await customerPool.query(
            `CALL sp_book_queue_pass(?, ?, ?, ?, @out_pass_id)`,
            [bandId, attractionId, slotStartTime, slotEndTime]
        );

        const [result] = await customerPool.query(`SELECT @out_pass_id AS passId`);
        const passId = result[0]?.passId;

        // Fetch booked pass details for boarding pass
        const [passDetails] = await trackedQuery(
            customerPool,
            `SELECT * FROM Vw_My_Pass_Details WHERE Pass_ID = ?`,
            [passId],
            'Customer Queue: Fetch Booked Pass'
        );

        // Fetch updated wallet balance after debiting ride price
        const [bandRows] = await customerPool.query(
            `SELECT Wallet_Balance FROM RFID_Wristband WHERE Band_ID = ?`,
            [bandId]
        );
        const newBalance = parseFloat(bandRows[0]?.Wallet_Balance || 0);
        const debitedAmount = parseFloat(passDetails[0]?.Ride_Price || 0);

        // Broadcast queue update and wallet update via SSE
        broadcastEvent('queue_updated', {
            bandId,
            passId,
            attractionId,
            status: 'Booked'
        });

        broadcastEvent('wallet_updated', {
            bandId,
            newBalance,
            delta: -debitedAmount,
            type: 'Ride-Debit',
            attractionName: passDetails[0]?.Attraction_Name,
            timestamp: new Date().toISOString()
        });

        return res.json({
            success: true,
            message: `Virtual Queue FastPass booked successfully! Debited ₹${debitedAmount.toFixed(2)} from your wallet.`,
            pass: passDetails[0],
            newBalance,
            debitedAmount
        });

    } catch (err) {
        const formatted = formatDatabaseError(err);
        return res.status(400).json(formatted);
    }
});

router.post('/queue/cancel', async (req, res) => {
    const { bandId } = req.user;
    const { passId } = req.body;

    if (!passId) {
        return res.status(400).json({ error: true, message: 'Pass ID is required.' });
    }

    try {
        await customerPool.query(
            `CALL sp_cancel_queue_pass(?, ?)`,
            [passId, bandId]
        );

        // Fetch updated wallet balance after refund
        const [bandRows] = await customerPool.query(
            `SELECT Wallet_Balance FROM RFID_Wristband WHERE Band_ID = ?`,
            [bandId]
        );
        const newBalance = parseFloat(bandRows[0]?.Wallet_Balance || 0);

        broadcastEvent('queue_updated', {
            bandId,
            passId,
            status: 'Cancelled'
        });

        broadcastEvent('wallet_updated', {
            bandId,
            newBalance,
            type: 'Refund',
            timestamp: new Date().toISOString()
        });

        return res.json({
            success: true,
            message: 'Virtual Queue reservation cancelled. Ride pass fee has been refunded to your wallet.',
            newBalance
        });

    } catch (err) {
        return res.status(400).json(formatDatabaseError(err));
    }
});

// ==========================================
// 4. WALLET HISTORY & SPENDING BREAKDOWN
// ==========================================
router.get('/wallet/history', async (req, res) => {
    const { bandId } = req.user;

    try {
        const [transactions] = await trackedQuery(
            customerPool,
            `SELECT 
                t.Transaction_ID,
                t.Transaction_Type,
                t.Amount,
                t.Closing_Balance,
                t.Transaction_Time,
                o.Outlet_Name,
                o.Type AS Outlet_Type
             FROM Wallet_Transaction t
             LEFT JOIN POS_Outlet o ON t.Outlet_ID = o.Outlet_ID
             WHERE t.Band_ID = ?
             ORDER BY t.Transaction_Time DESC`,
            [bandId],
            'Customer Wallet: History'
        );

        // Spending by category breakdown for donut chart
        let totalSpent = 0;
        let totalTopUp = 0;
        const categoryMap = { 'F&B': 0, 'Souvenirs': 0, 'Photo': 0 };

        transactions.forEach(t => {
            const amt = parseFloat(t.Amount);
            if (t.Transaction_Type === 'Purchase') {
                totalSpent += amt;
                const cat = t.Outlet_Type || 'F&B';
                categoryMap[cat] = (categoryMap[cat] || 0) + amt;
            } else if (t.Transaction_Type === 'Top-up') {
                totalTopUp += amt;
            }
        });

        const categoryData = Object.keys(categoryMap).map(name => ({
            name,
            value: categoryMap[name]
        }));

        return res.json({
            success: true,
            transactions,
            totalSpent,
            totalTopUp,
            spendingByCategory: categoryData
        });

    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

// ==========================================
// 5. SMART LOCKERS
// ==========================================
router.get('/lockers', async (req, res) => {
    const { bandId } = req.user;

    try {
        const [allLockers] = await trackedQuery(
            customerPool,
            `SELECT 
                l.Locker_ID,
                l.Zone,
                l.Number,
                CASE 
                    WHEN r.Rental_ID IS NOT NULL AND r.Status = 'Active' THEN 0 
                    ELSE 1 
                END AS Is_Available,
                CASE 
                    WHEN r.Band_ID = ? AND r.Status = 'Active' THEN 1 
                    ELSE 0 
                END AS Is_My_Locker,
                r.Rental_ID,
                r.Rental_Start_Time
             FROM Locker l
             LEFT JOIN Locker_Rental r ON l.Locker_ID = r.Locker_ID AND r.Status = 'Active'
             ORDER BY l.Zone ASC, l.Number ASC`,
            [bandId],
            'Customer Lockers: List All'
        );

        const myLocker = allLockers.find(l => l.Is_My_Locker === 1) || null;

        return res.json({
            success: true,
            lockers: allLockers,
            myLocker
        });

    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

router.post('/lockers/rent', async (req, res) => {
    const { bandId } = req.user;
    const { lockerId } = req.body;

    if (!lockerId) {
        return res.status(400).json({ error: true, message: 'Locker ID is required.' });
    }

    try {
        await customerPool.query(
            `CALL sp_rent_locker(?, ?, @out_rental_id)`,
            [bandId, lockerId]
        );

        const [resOut] = await customerPool.query(`SELECT @out_rental_id AS rentalId`);
        const rentalId = resOut[0]?.rentalId;

        broadcastEvent('locker_updated', {
            bandId,
            lockerId,
            rentalId,
            status: 'Active'
        });

        return res.json({
            success: true,
            message: 'Smart Locker rented successfully! Your wristband is now your key.',
            rentalId
        });

    } catch (err) {
        return res.status(400).json(formatDatabaseError(err));
    }
});

router.post('/lockers/release', async (req, res) => {
    const { bandId } = req.user;
    const { rentalId } = req.body;

    if (!rentalId) {
        return res.status(400).json({ error: true, message: 'Rental ID is required.' });
    }

    try {
        await customerPool.query(
            `CALL sp_release_locker(?, ?)`,
            [rentalId, bandId]
        );

        broadcastEvent('locker_updated', {
            bandId,
            rentalId,
            status: 'Released'
        });

        return res.json({
            success: true,
            message: 'Smart Locker released successfully. Thank you!'
        });

    } catch (err) {
        return res.status(400).json(formatDatabaseError(err));
    }
});

// ==========================================
// 6. INTERACTIVE PARK MAP DATA
// ==========================================
router.get('/map', async (req, res) => {
    try {
        const [rides] = await trackedQuery(
            customerPool,
            `SELECT * FROM Vw_Attraction_Live_Load`,
            [],
            'Customer Map: Rides'
        );

        const [lockers] = await trackedQuery(
            customerPool,
            `SELECT Zone, COUNT(*) AS Total, SUM(CASE WHEN r.Status = 'Active' THEN 1 ELSE 0 END) AS Occupied
             FROM Locker l
             LEFT JOIN Locker_Rental r ON l.Locker_ID = r.Locker_ID AND r.Status = 'Active'
             GROUP BY Zone`,
            [],
            'Customer Map: Lockers'
        );

        const [outlets] = await trackedQuery(
            customerPool,
            `SELECT * FROM POS_Outlet`,
            [],
            'Customer Map: Outlets'
        );

        return res.json({
            success: true,
            zones: [
                { id: 'entrance', name: 'Main Entrance & Plaza', heat: 'Low', color: '#10B981' },
                { id: 'thrill', name: 'Extreme Thrill Valley', heat: 'High', color: '#EF4444' },
                { id: 'water', name: 'Thunder Lagoon & Water Zone', heat: 'Moderate', color: '#3B82F6' },
                { id: 'family', name: 'Family Galaxy Promenade', heat: 'Low', color: '#8B5CF6' }
            ],
            rides,
            lockers,
            outlets
        });

    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

// ==========================================
// 7. SECURITY TEST ROUTE (Proves 403 Forbidden)
// ==========================================
router.get('/spy-other-visitor', (req, res) => {
    // Attempting to request someone else's data
    const requestedBandId = req.query.targetBandId;
    if (parseInt(requestedBandId, 10) !== req.user.bandId) {
        return res.status(403).json({
            error: true,
            status: 403,
            message: 'SECURITY VIOLATION (403 Forbidden): Cross-visitor data access is strictly prohibited. Customer queries are securely bound to the authenticated JWT session context.'
        });
    }
    return res.json({ success: true, data: 'Access authorized for self profile.' });
});

module.exports = router;
