/**
 * Admin: Park Operations & Finance (/api/admin/ops/*)
 * Real-time controllers for wallet top-ups, registration desk,
 * POS tap simulation, turnstile ride validation, lockers, and live revenue.
 */

const express = require('express');
const router = express.Router();
const { adminPool, trackedQuery } = require('../../config/db');
const { verifyAdmin } = require('../../middleware/auth');
const { formatDatabaseError } = require('../../utils/dbErrorHandler');
const { broadcastEvent } = require('../events');

// Enforce admin JWT
router.use(verifyAdmin);

// ==========================================
// 1. WALLET MANAGEMENT (TOP-UP, REFUND, RECEIPT)
// ==========================================
router.post('/wallet/topup', async (req, res) => {
    const { bandId, amount } = req.body;

    if (!bandId || !amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: true, message: 'Valid wristband and positive top-up amount are required.' });
    }

    try {
        // Fetch current balance before top-up
        const [prevRows] = await adminPool.query(
            `SELECT w.Wallet_Balance, v.Full_Name, w.Band_UID 
             FROM RFID_Wristband w 
             JOIN Visitor v ON w.Visitor_ID = v.Visitor_ID 
             WHERE w.Band_ID = ?`,
            [bandId]
        );

        if (!prevRows || prevRows.length === 0) {
            return res.status(404).json({ error: true, message: 'Wristband not found.' });
        }

        const prevBalance = parseFloat(prevRows[0].Wallet_Balance);
        const visitorName = prevRows[0].Full_Name;
        const bandUid = prevRows[0].Band_UID;

        // Call stored procedure
        await adminPool.query(`CALL sp_top_up_wallet(?, ?, @new_balance)`, [bandId, amount]);
        const [outRes] = await adminPool.query(`SELECT @new_balance AS newBalance`);
        const newBalance = parseFloat(outRes[0]?.newBalance || (prevBalance + parseFloat(amount)));

        // Broadcast live wallet update to customer screen
        broadcastEvent('wallet_updated', {
            bandId: parseInt(bandId, 10),
            bandUid,
            previousBalance: prevBalance,
            newBalance,
            delta: parseFloat(amount),
            type: 'Top-up',
            timestamp: new Date().toISOString()
        });

        // Generate thermal receipt metadata
        const receipt = {
            receiptNumber: `RCP-${Date.now().toString().slice(-6)}`,
            dateTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            visitorName,
            bandUid,
            topUpAmount: parseFloat(amount),
            previousBalance: prevBalance,
            closingBalance: newBalance,
            paymentMode: 'CASH / CARD (Front Desk Desk #1)',
            authorizedBy: 'Park Cashier System'
        };

        return res.json({
            success: true,
            message: `Successfully topped up ₹${amount} to ${visitorName}'s wristband (${bandUid}).`,
            previousBalance: prevBalance,
            newBalance,
            receipt
        });

    } catch (err) {
        return res.status(400).json(formatDatabaseError(err));
    }
});

// Bulk top-up for multiple wristbands
router.post('/wallet/bulk-topup', async (req, res) => {
    const { bandIds, amount } = req.body;

    if (!Array.isArray(bandIds) || bandIds.length === 0 || !amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: true, message: 'Valid band IDs array and positive amount required.' });
    }

    try {
        const results = [];
        for (const bandId of bandIds) {
            try {
                await adminPool.query(`CALL sp_top_up_wallet(?, ?, @new_balance)`, [bandId, amount]);
                const [outRes] = await adminPool.query(`SELECT @new_balance AS newBalance`);
                results.push({ bandId, success: true, newBalance: outRes[0]?.newBalance });

                broadcastEvent('wallet_updated', {
                    bandId: parseInt(bandId, 10),
                    newBalance: parseFloat(outRes[0]?.newBalance || 0),
                    delta: parseFloat(amount),
                    type: 'Top-up'
                });
            } catch (e) {
                results.push({ bandId, success: false, error: e.message });
            }
        }

        return res.json({
            success: true,
            message: `Processed bulk top-up for ${bandIds.length} wristbands.`,
            results
        });

    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

// ==========================================
// 2. REGISTRATION DESK (ATOMIC 1:1 TRANSACTION)
// ==========================================
router.post('/register', async (req, res) => {
    const { fullName, heightCm, email, phone, openingBalance, pin } = req.body;

    if (!fullName || !heightCm || !email || !phone) {
        return res.status(400).json({ error: true, message: 'Full Name, Height, Email, and Phone are required.' });
    }

    const initialFloat = parseFloat(openingBalance || 0);

    try {
        // Call sp_register_visitor_with_band (which manages transaction and rollbacks)
        await adminPool.query(
            `CALL sp_register_visitor_with_band(?, ?, ?, ?, ?, NULL, @out_vis_id, @out_band_uid)`,
            [fullName.trim(), heightCm, email.trim(), phone.trim(), initialFloat]
        );

        const [outRes] = await adminPool.query(`SELECT @out_vis_id AS visitorId, @out_band_uid AS bandUid`);
        const visitorId = outRes[0]?.visitorId;
        const bandUid = outRes[0]?.bandUid;

        // Fetch newly created record
        const [newBand] = await adminPool.query(
            `SELECT * FROM RFID_Wristband WHERE Band_UID = ?`,
            [bandUid]
        );

        return res.json({
            success: true,
            message: `Visitor "${fullName}" registered and issued RFID Wristband ${bandUid}!`,
            visitorId,
            bandUid,
            wristband: newBand[0]
        });

    } catch (err) {
        return res.status(400).json(formatDatabaseError(err));
    }
});

// Update Wristband Status (Active, Inactive, Lost)
router.patch('/wristband/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Active', 'Inactive', 'Lost'].includes(status)) {
        return res.status(400).json({ error: true, message: 'Status must be Active, Inactive, or Lost.' });
    }

    try {
        await trackedQuery(
            adminPool,
            `UPDATE RFID_Wristband SET Status = ? WHERE Band_ID = ?`,
            [status, id],
            `Update Wristband Status #${id}`
        );

        // Audit log
        await adminPool.query(
            `INSERT INTO Park_Audit_Log (Event_Type, Band_ID, Reference_ID, Description, Logged_At)
             VALUES ('Wristband_Status', ?, NULL, CONCAT('Wristband status changed to ', ?), NOW())`,
            [id, status]
        );

        broadcastEvent('wristband_status_changed', { bandId: parseInt(id, 10), status });

        return res.json({ success: true, message: `Wristband #${id} status updated to "${status}".` });

    } catch (err) {
        return res.status(400).json(formatDatabaseError(err));
    }
});

// ==========================================
// 3. POS SIMULATOR (TAP TO PAY)
// ==========================================
router.post('/pos/simulate', async (req, res) => {
    const { bandId, outletId, amount } = req.body;

    if (!bandId || !outletId || !amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: true, message: 'Wristband, Outlet, and positive Amount required.' });
    }

    try {
        // Calls sp_make_purchase which triggers trg_wallet_transaction_apply
        // If balance < amount, trigger signals SQLSTATE 45000 'Insufficient wallet balance for purchase'
        await adminPool.query(
            `CALL sp_make_purchase(?, ?, ?, @new_balance)`,
            [bandId, outletId, amount]
        );

        const [outRes] = await adminPool.query(`SELECT @new_balance AS newBalance`);
        const newBalance = parseFloat(outRes[0]?.newBalance || 0);

        // Broadcast wallet update to customer screen
        broadcastEvent('wallet_updated', {
            bandId: parseInt(bandId, 10),
            newBalance,
            delta: -parseFloat(amount),
            type: 'Purchase',
            outletId
        });

        return res.json({
            success: true,
            status: 'APPROVED',
            message: `Payment of ₹${amount} approved! Remaining balance: ₹${newBalance}.`,
            newBalance
        });

    } catch (err) {
        const formatted = formatDatabaseError(err);
        return res.status(400).json({
            ...formatted,
            status: 'REJECTED'
        });
    }
});

// ==========================================
// 4. TURNSTILE / RIDE TAP SIMULATOR
// ==========================================
router.post('/turnstile/simulate', async (req, res) => {
    const { bandId, attractionId } = req.body;

    if (!bandId || !attractionId) {
        return res.status(400).json({ error: true, message: 'Wristband and Attraction are required.' });
    }

    try {
        // Call sp_ride_tap_in
        await adminPool.query(
            `CALL sp_ride_tap_in(?, ?, @out_status, @out_reason)`,
            [bandId, attractionId]
        );

        const [outRes] = await adminPool.query(`SELECT @out_status AS status, @out_reason AS reason`);
        const status = outRes[0]?.status || 'DENIED';
        const reason = outRes[0]?.reason || 'Unknown error';

        broadcastEvent('turnstile_tap', {
            bandId: parseInt(bandId, 10),
            attractionId: parseInt(attractionId, 10),
            status,
            reason,
            timestamp: new Date().toISOString()
        });

        return res.json({
            success: true,
            status, // 'GRANTED' or 'DENIED'
            reason
        });

    } catch (err) {
        return res.status(400).json(formatDatabaseError(err));
    }
});

// ==========================================
// 5. QUEUE CONTROL
// ==========================================
router.get('/queue/overview', async (req, res) => {
    try {
        const [passes] = await trackedQuery(
            adminPool,
            `SELECT 
                q.Pass_ID,
                q.Band_ID,
                w.Band_UID,
                v.Full_Name,
                a.Attraction_Name,
                q.Slot_Start_Time,
                q.Slot_End_Time,
                q.Status,
                q.Created_At
             FROM Virtual_Queue_Pass q
             JOIN RFID_Wristband w ON q.Band_ID = w.Band_ID
             JOIN Visitor v ON w.Visitor_ID = v.Visitor_ID
             JOIN Attraction a ON q.Attraction_ID = a.Attraction_ID
             ORDER BY q.Slot_Start_Time ASC, q.Created_At DESC`,
            [],
            'Queue Overview'
        );

        const [stats] = await adminPool.query(
            `SELECT 
                a.Attraction_ID,
                a.Attraction_Name,
                a.Capacity_Per_Slot,
                COUNT(CASE WHEN q.Status = 'Booked' THEN 1 END) AS Booked_Count
             FROM Attraction a
             LEFT JOIN Virtual_Queue_Pass q ON a.Attraction_ID = q.Attraction_ID
             GROUP BY a.Attraction_ID, a.Attraction_Name, a.Capacity_Per_Slot`
        );

        return res.json({ success: true, passes, stats });

    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

router.post('/queue/cancel', async (req, res) => {
    const { passId } = req.body;
    if (!passId) return res.status(400).json({ error: true, message: 'Pass ID required.' });

    try {
        await adminPool.query(`UPDATE Virtual_Queue_Pass SET Status = 'Cancelled' WHERE Pass_ID = ?`, [passId]);
        broadcastEvent('queue_updated', { passId, status: 'Cancelled' });
        return res.json({ success: true, message: `Pass #${passId} has been cancelled by operator.` });
    } catch (err) {
        return res.status(400).json(formatDatabaseError(err));
    }
});

// ==========================================
// 6. LOCKER CONTROL
// ==========================================
router.get('/lockers/overview', async (req, res) => {
    try {
        const [lockers] = await trackedQuery(
            adminPool,
            `SELECT 
                l.Locker_ID,
                l.Zone,
                l.Number,
                r.Rental_ID,
                r.Status AS Rental_Status,
                r.Rental_Start_Time,
                w.Band_UID,
                v.Full_Name AS Renter_Name
             FROM Locker l
             LEFT JOIN Locker_Rental r ON l.Locker_ID = r.Locker_ID AND r.Status = 'Active'
             LEFT JOIN RFID_Wristband w ON r.Band_ID = w.Band_ID
             LEFT JOIN Visitor v ON w.Visitor_ID = v.Visitor_ID
             ORDER BY l.Zone, l.Number`,
            [],
            'Locker Overview'
        );

        return res.json({ success: true, lockers });

    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

router.post('/lockers/force-release', async (req, res) => {
    const { rentalId } = req.body;
    if (!rentalId) return res.status(400).json({ error: true, message: 'Rental ID is required.' });

    try {
        await adminPool.query(`CALL sp_release_locker(?, 0)`, [rentalId]);
        broadcastEvent('locker_updated', { rentalId, status: 'Released' });
        return res.json({ success: true, message: `Locker rental #${rentalId} force-released.` });
    } catch (err) {
        return res.status(400).json(formatDatabaseError(err));
    }
});

router.post('/lockers/add', async (req, res) => {
    const { zone, number } = req.body;
    if (!zone || !number) {
        return res.status(400).json({ error: true, message: 'Locker Zone and Locker Number are required.' });
    }

    try {
        const cleanZone = zone.trim();
        const cleanNumber = number.trim().toUpperCase();

        const [existing] = await adminPool.query(
            `SELECT Locker_ID FROM Locker WHERE Zone = ? AND Number = ?`,
            [cleanZone, cleanNumber]
        );
        if (existing.length > 0) {
            return res.status(400).json({ 
                error: true, 
                message: `Locker "${cleanNumber}" already exists in "${cleanZone}". Choose a unique number.` 
            });
        }

        const [insertRes] = await adminPool.query(
            `INSERT INTO Locker (Zone, Number) VALUES (?, ?)`,
            [cleanZone, cleanNumber]
        );

        broadcastEvent('locker_updated', {
            action: 'added',
            lockerId: insertRes.insertId,
            zone: cleanZone,
            number: cleanNumber
        });

        return res.json({
            success: true,
            message: `New locker ${cleanNumber} successfully added to ${cleanZone}!`,
            locker: {
                Locker_ID: insertRes.insertId,
                Zone: cleanZone,
                Number: cleanNumber
            }
        });
    } catch (err) {
        return res.status(400).json(formatDatabaseError(err));
    }
});

// ==========================================
// 7. REVENUE DASHBOARD (FROM Vw_Outlet_Revenue)
// ==========================================
router.get('/revenue-dashboard', async (req, res) => {
    try {
        // Outlet Revenue View
        const [outletData] = await trackedQuery(
            adminPool,
            `SELECT * FROM Vw_Outlet_Revenue ORDER BY Total_Revenue_INR DESC`,
            [],
            'Revenue Dashboard: Outlets'
        );

        // Overall Wallet Float
        const [floatRes] = await adminPool.query(
            `SELECT 
                COUNT(*) AS Total_Wristbands,
                SUM(Wallet_Balance) AS Total_Float_INR,
                AVG(Wallet_Balance) AS Avg_Balance_INR
             FROM RFID_Wristband`
        );

        // Top Spenders
        const [topSpenders] = await adminPool.query(
            `SELECT 
                v.Full_Name,
                w.Band_UID,
                SUM(t.Amount) AS Total_Spent_INR
             FROM Wallet_Transaction t
             JOIN RFID_Wristband w ON t.Band_ID = w.Band_ID
             JOIN Visitor v ON w.Visitor_ID = v.Visitor_ID
             WHERE t.Transaction_Type = 'Purchase'
             GROUP BY v.Visitor_ID, v.Full_Name, w.Band_UID
             ORDER BY Total_Spent_INR DESC
             LIMIT 5`
        );

        // Hourly Transaction Volume
        const [hourly] = await adminPool.query(
            `SELECT 
                HOUR(Transaction_Time) AS Hour_Of_Day,
                COUNT(*) AS Txn_Count,
                SUM(CASE WHEN Transaction_Type = 'Purchase' THEN Amount ELSE 0 END) AS Purchase_INR,
                SUM(CASE WHEN Transaction_Type = 'Top-up' THEN Amount ELSE 0 END) AS Topup_INR
             FROM Wallet_Transaction
             GROUP BY HOUR(Transaction_Time)
             ORDER BY Hour_Of_Day`
        );

        return res.json({
            success: true,
            outletRevenue: outletData,
            summary: {
                totalFloat: parseFloat(floatRes[0]?.Total_Float_INR || 0),
                totalWristbands: floatRes[0]?.Total_Wristbands || 0,
                avgBalance: parseFloat(floatRes[0]?.Avg_Balance_INR || 0)
            },
            topSpenders,
            hourlyVolume: hourly
        });

    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

// ==========================================
// 8. IMMUTABLE AUDIT LOG
// ==========================================
router.get('/audit-log', async (req, res) => {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const offset = (page - 1) * limit;

    try {
        const [count] = await adminPool.query(`SELECT COUNT(*) AS total FROM Park_Audit_Log`);
        const total = count[0]?.total || 0;

        const [logs] = await trackedQuery(
            adminPool,
            `SELECT 
                l.Log_ID,
                l.Event_Type,
                l.Band_ID,
                w.Band_UID,
                v.Full_Name,
                l.Reference_ID,
                l.Description,
                l.Logged_At
             FROM Park_Audit_Log l
             LEFT JOIN RFID_Wristband w ON l.Band_ID = w.Band_ID
             LEFT JOIN Visitor v ON w.Visitor_ID = v.Visitor_ID
             ORDER BY l.Logged_At DESC, l.Log_ID DESC
             LIMIT ? OFFSET ?`,
            [limit, offset],
            'Audit Log Stream'
        );

        return res.json({
            success: true,
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

// ==========================================
// 9. LIVE CUSTOMER TELEMETRY & ACTIVITY MONITOR
// ==========================================
router.get('/customers/live-telemetry', async (req, res) => {
    try {
        // Query all visitors, wristbands, and active state
        const [visitors] = await trackedQuery(
            adminPool,
            `SELECT 
                v.Visitor_ID,
                v.Full_Name,
                v.Height_cm,
                v.Email,
                v.Phone,
                v.Registration_Date,
                w.Band_ID,
                w.Band_UID,
                w.Wallet_Balance,
                w.Status AS Wristband_Status
             FROM Visitor v
             JOIN RFID_Wristband w ON v.Visitor_ID = w.Visitor_ID
             ORDER BY v.Visitor_ID ASC`,
            [],
            'Telemetry: All Park Visitors'
        );

        // Fetch all active/booked/used passes for today
        const [allPasses] = await adminPool.query(
            `SELECT 
                q.Pass_ID,
                q.Band_ID,
                q.Attraction_ID,
                a.Attraction_Name,
                a.Category,
                a.Park_Land,
                COALESCE(a.Ride_Price, 150.00) AS Ride_Price,
                q.Slot_Start_Time,
                q.Slot_End_Time,
                q.Status,
                q.Created_At
             FROM Virtual_Queue_Pass q
             JOIN Attraction a ON q.Attraction_ID = a.Attraction_ID
             ORDER BY q.Slot_Start_Time ASC`
        );

        // Fetch all active locker rentals
        const [allLockers] = await adminPool.query(
            `SELECT 
                r.Rental_ID,
                r.Band_ID,
                r.Locker_ID,
                l.Number AS Locker_Number,
                l.Zone AS Locker_Zone,
                r.Rental_Start_Time,
                r.Status
             FROM Locker_Rental r
             JOIN Locker l ON r.Locker_ID = l.Locker_ID
             WHERE r.Status = 'Active'`
        );

        // Fetch recent transactions for each wristband
        const [recentTxns] = await adminPool.query(
            `SELECT 
                t.Transaction_ID,
                t.Band_ID,
                t.Transaction_Type,
                t.Amount,
                t.Closing_Balance,
                t.Transaction_Time,
                COALESCE(o.Outlet_Name, a.Attraction_Name, t.Notes, 'Front Desk Kiosk') AS Outlet_Or_Ride,
                COALESCE(o.Type, 'Ride Pass') AS Category
             FROM Wallet_Transaction t
             LEFT JOIN POS_Outlet o ON t.Outlet_ID = o.Outlet_ID
             LEFT JOIN Attraction a ON t.Attraction_ID = a.Attraction_ID
             ORDER BY t.Transaction_Time DESC`
        );

        // Group into rich customer telemetry objects
        const customerTelemetry = visitors.map(v => {
            const customerPasses = allPasses.filter(p => p.Band_ID === v.Band_ID);
            const customerLocker = allLockers.find(l => l.Band_ID === v.Band_ID) || null;
            const customerTxns = recentTxns.filter(t => t.Band_ID === v.Band_ID).slice(0, 8);
            
            // Calculate total spent
            const totalSpent = customerTxns
                .filter(t => t.Transaction_Type === 'Purchase')
                .reduce((acc, curr) => acc + parseFloat(curr.Amount), 0);

            // Determine what the customer is actively doing right now
            const usedPass = customerPasses.find(p => p.Status === 'Used');
            const bookedPass = customerPasses.find(p => p.Status === 'Booked');

            let currentActivity = {
                state: 'EXPLORING',
                label: 'Exploring Theme Park Grounds',
                badgeColor: 'emerald',
                attractionName: null,
                slotTime: null
            };

            if (usedPass) {
                currentActivity = {
                    state: 'ON_RIDE',
                    label: `Currently on Ride: ${usedPass.Attraction_Name}`,
                    badgeColor: 'purple',
                    attractionName: usedPass.Attraction_Name,
                    slotTime: `${usedPass.Slot_Start_Time} - ${usedPass.Slot_End_Time}`
                };
            } else if (bookedPass) {
                currentActivity = {
                    state: 'QUEUED',
                    label: `In FastPass Virtual Queue: ${bookedPass.Attraction_Name}`,
                    badgeColor: 'sky',
                    attractionName: bookedPass.Attraction_Name,
                    slotTime: `${bookedPass.Slot_Start_Time} - ${bookedPass.Slot_End_Time}`
                };
            } else if (customerLocker) {
                currentActivity = {
                    state: 'LOCKER',
                    label: `Accessing Locker ${customerLocker.Locker_Number} (${customerLocker.Locker_Zone})`,
                    badgeColor: 'indigo',
                    attractionName: null,
                    slotTime: null
                };
            }

            return {
                ...v,
                Wallet_Balance: parseFloat(v.Wallet_Balance || 0),
                Height_cm: parseFloat(v.Height_cm),
                currentActivity,
                activePasses: customerPasses,
                activeLocker: customerLocker,
                recentTransactions: customerTxns,
                totalSpent
            };
        });

        return res.json({
            success: true,
            totalVisitorsInPark: visitors.length,
            customers: customerTelemetry
        });

    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

// ==========================================
// 10. ADMINISTRATOR UPDATE VISITOR & SET WALLET
// ==========================================
router.post('/visitor/update', async (req, res) => {
    const { visitorId, bandId, fullName, heightCm, email, phone, status, setWalletBalance, bandUid } = req.body;

    if (!visitorId || !bandId) {
        return res.status(400).json({ error: true, message: 'Visitor ID and Band ID are required.' });
    }

    try {
        // 1. If administrator updated or assigned a specific Band UID
        let cleanUid = null;
        if (bandUid && bandUid.trim()) {
            cleanUid = bandUid.trim().toUpperCase();

            // Validate that this UID is not already owned by another wristband
            const [existing] = await adminPool.query(
                `SELECT Band_ID, Visitor_ID FROM RFID_Wristband WHERE Band_UID = ? AND Band_ID != ?`,
                [cleanUid, bandId]
            );

            if (existing.length > 0) {
                return res.status(400).json({
                    error: true,
                    message: `RFID Band UID "${cleanUid}" is already assigned to Visitor #${existing[0].Visitor_ID}. Every guest must have a unique RFID wristband.`
                });
            }

            // Update the unique Band_UID
            await adminPool.query(
                `UPDATE RFID_Wristband SET Band_UID = ? WHERE Band_ID = ?`,
                [cleanUid, bandId]
            );

            // Broadcast live wristband update event
            broadcastEvent('wristband_reassigned', {
                bandId: parseInt(bandId, 10),
                visitorId: parseInt(visitorId, 10),
                bandUid: cleanUid,
                fullName: fullName ? fullName.trim() : 'Visitor',
                timestamp: new Date().toISOString()
            });
        }

        // 2. Update Visitor basic details
        if (fullName || heightCm || email || phone) {
            await adminPool.query(
                `UPDATE Visitor 
                 SET Full_Name = COALESCE(?, Full_Name),
                     Height_cm = COALESCE(?, Height_cm),
                     Email = COALESCE(?, Email),
                     Phone = COALESCE(?, Phone)
                 WHERE Visitor_ID = ?`,
                [fullName ? fullName.trim() : null, heightCm || null, email ? email.trim() : null, phone ? phone.trim() : null, visitorId]
            );
        }

        // 3. Update Wristband status if provided
        if (status && ['Active', 'Inactive', 'Lost', 'Pending'].includes(status)) {
            await adminPool.query(
                `UPDATE RFID_Wristband SET Status = ? WHERE Band_ID = ?`,
                [status, bandId]
            );
        }

        // 4. If administrator set/adjusted the wallet balance directly
        let newBalance = null;
        if (setWalletBalance !== undefined && setWalletBalance !== null && setWalletBalance !== '') {
            const targetBalance = parseFloat(setWalletBalance);
            if (targetBalance < 0) {
                return res.status(400).json({ error: true, message: 'Wallet balance cannot be negative.' });
            }

            // Get current balance
            const [bRows] = await adminPool.query(
                `SELECT Wallet_Balance FROM RFID_Wristband WHERE Band_ID = ?`,
                [bandId]
            );
            const currentBalance = parseFloat(bRows[0]?.Wallet_Balance || 0);
            const diff = targetBalance - currentBalance;

            if (diff > 0) {
                // Top-up difference
                await adminPool.query(`CALL sp_top_up_wallet(?, ?, @new_balance)`, [bandId, diff]);
                newBalance = targetBalance;
            } else if (diff < 0) {
                // Adjustment deduction
                const deductAmount = Math.abs(diff);
                await adminPool.query(
                    `INSERT INTO Wallet_Transaction (Band_ID, Outlet_ID, Transaction_Type, Amount, Closing_Balance, Transaction_Time, Notes)
                     VALUES (?, NULL, 'Purchase', ?, 0.00, NOW(), 'Administrator Balance Adjustment')`,
                    [bandId, deductAmount]
                );
                newBalance = targetBalance;
            } else {
                newBalance = currentBalance;
            }

            // Broadcast wallet updated
            broadcastEvent('wallet_updated', {
                bandId: parseInt(bandId, 10),
                newBalance: targetBalance,
                delta: diff,
                type: 'Admin-Adjustment',
                timestamp: new Date().toISOString()
            });
        }

        // Fetch updated record
        const [updatedRows] = await adminPool.query(
            `SELECT v.*, w.Band_UID, w.Wallet_Balance, w.Status AS Wristband_Status
             FROM Visitor v
             JOIN RFID_Wristband w ON v.Visitor_ID = w.Visitor_ID
             WHERE v.Visitor_ID = ?`,
            [visitorId]
        );

        // Audit log
        await adminPool.query(
            `INSERT INTO Park_Audit_Log (Event_Type, Band_ID, Reference_ID, Description, Logged_At)
             VALUES ('Wristband_Status', ?, ?, CONCAT('Administrator updated profile/band for ', ?), NOW())`,
            [bandId, visitorId, fullName || updatedRows[0]?.Full_Name]
        );

        return res.json({
            success: true,
            message: `Profile and RFID Wristband (${cleanUid || updatedRows[0]?.Band_UID}) updated successfully.`,
            visitor: updatedRows[0]
        });

    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

// ==========================================
// 10B. ASSIGN OR SWAP UNIQUE RFID WRISTBAND (COUNTER DESK)
// ==========================================
router.post('/wristband/assign', async (req, res) => {
    const { visitorId, bandId, newBandUid, reason } = req.body;

    if (!visitorId || !bandId) {
        return res.status(400).json({ error: true, message: 'Visitor ID and Band ID are required.' });
    }

    try {
        let targetUid = newBandUid ? newBandUid.trim().toUpperCase() : null;

        if (!targetUid || targetUid === 'AUTO') {
            // Auto-generate unique UID
            let exists = 1;
            while (exists > 0) {
                const randNum = Math.floor(1000 + Math.random() * 9000);
                targetUid = `UID-WB${randNum}`;
                const [checkRows] = await adminPool.query(
                    `SELECT COUNT(*) as cnt FROM RFID_Wristband WHERE Band_UID = ?`,
                    [targetUid]
                );
                exists = checkRows[0].cnt;
            }
        } else {
            // Check uniqueness
            const [existing] = await adminPool.query(
                `SELECT Band_ID, Visitor_ID FROM RFID_Wristband WHERE Band_UID = ? AND Band_ID != ?`,
                [targetUid, bandId]
            );

            if (existing.length > 0) {
                return res.status(400).json({
                    error: true,
                    message: `RFID Band UID "${targetUid}" is already assigned to Visitor #${existing[0].Visitor_ID}. Every guest must have a unique RFID wristband.`
                });
            }
        }

        // Fetch old band UID for audit
        const [oldRows] = await adminPool.query(
            `SELECT Band_UID, Status FROM RFID_Wristband WHERE Band_ID = ?`,
            [bandId]
        );
        const oldUid = oldRows[0]?.Band_UID || 'N/A';

        // Update Band_UID
        await adminPool.query(
            `UPDATE RFID_Wristband SET Band_UID = ? WHERE Band_ID = ?`,
            [targetUid, bandId]
        );

        // Audit log
        await adminPool.query(
            `INSERT INTO Park_Audit_Log (Event_Type, Band_ID, Reference_ID, Description, Logged_At)
             VALUES ('Wristband_Status', ?, ?, CONCAT('Assigned unique RFID band ', ?, ' (previous: ', ?, ') - Reason: ', ?), NOW())`,
            [bandId, visitorId, targetUid, oldUid, reason || 'Counter Band Assignment']
        );

        // Broadcast SSE event
        broadcastEvent('wristband_reassigned', {
            bandId: parseInt(bandId, 10),
            visitorId: parseInt(visitorId, 10),
            oldBandUid: oldUid,
            newBandUid: targetUid,
            reason: reason || 'Front Desk RFID Assignment',
            timestamp: new Date().toISOString()
        });

        return res.json({
            success: true,
            message: `Successfully assigned unique RFID Wristband (${targetUid}) to Visitor #${visitorId}.`,
            oldBandUid: oldUid,
            newBandUid: targetUid
        });

    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

// ==========================================
// 11. TURNSTILE BOARD RIDE (DISPATCH CUSTOMER)
// ==========================================
router.post('/turnstile/board-ride', async (req, res) => {
    const { bandId, attractionId } = req.body;

    if (!bandId || !attractionId) {
        return res.status(400).json({ error: true, message: 'Wristband and Attraction are required.' });
    }

    try {
        // Fetch ride details (Height safety & Ride Price)
        const [attrRows] = await adminPool.query(
            `SELECT Attraction_Name, Min_Height_cm, Max_Height_cm, COALESCE(Ride_Price, 150.00) AS Ride_Price 
             FROM Attraction WHERE Attraction_ID = ?`,
            [attractionId]
        );

        if (!attrRows || attrRows.length === 0) {
            return res.status(404).json({ error: true, message: 'Attraction not found.' });
        }

        const ride = attrRows[0];
        const ridePrice = parseFloat(ride.Ride_Price);

        // Fetch visitor details
        const [visitorRows] = await adminPool.query(
            `SELECT v.Full_Name, v.Height_cm, w.Band_UID, w.Wallet_Balance, w.Status 
             FROM RFID_Wristband w
             JOIN Visitor v ON w.Visitor_ID = v.Visitor_ID
             WHERE w.Band_ID = ?`,
            [bandId]
        );

        if (!visitorRows || visitorRows.length === 0) {
            return res.status(404).json({ error: true, message: 'Wristband not registered.' });
        }

        const visitor = visitorRows[0];
        const visitorHeight = parseFloat(visitor.Height_cm);
        const currentBalance = parseFloat(visitor.Wallet_Balance);

        // Safety Height Check
        if (visitorHeight < parseFloat(ride.Min_Height_cm)) {
            return res.status(400).json({
                error: true,
                status: 'DENIED',
                message: `Safety Height Check Failed: ${visitor.Full_Name} is ${visitorHeight} cm, but ${ride.Attraction_Name} requires minimum ${ride.Min_Height_cm} cm.`
            });
        }

        // Check if visitor has a Booked pass for this ride
        const [passRows] = await adminPool.query(
            `SELECT Pass_ID FROM Virtual_Queue_Pass 
             WHERE Band_ID = ? AND Attraction_ID = ? AND Status = 'Booked' 
             LIMIT 1`,
            [bandId, attractionId]
        );

        let passUsed = false;
        let passId = null;
        let debitedAmount = 0;

        if (passRows && passRows.length > 0) {
            // Visitor already has a booked FastPass -> mark as Used!
            passId = passRows[0].Pass_ID;
            await adminPool.query(
                `UPDATE Virtual_Queue_Pass SET Status = 'Used' WHERE Pass_ID = ?`,
                [passId]
            );
            passUsed = true;
        } else {
            // Direct Walk-in entry -> debit Ride Price from wallet via Wallet_Transaction!
            if (ridePrice > 0) {
                if (currentBalance < ridePrice) {
                    return res.status(400).json({
                        error: true,
                        status: 'DENIED',
                        message: `Insufficient Wallet Balance: Ride costs ₹${ridePrice.toFixed(2)}, but ${visitor.Full_Name}'s balance is ₹${currentBalance.toFixed(2)}. Please top up.`
                    });
                }

                await adminPool.query(
                    `INSERT INTO Wallet_Transaction (Band_ID, Outlet_ID, Transaction_Type, Amount, Closing_Balance, Transaction_Time, Attraction_ID, Notes)
                     VALUES (?, NULL, 'Purchase', ?, 0.00, NOW(), ?, CONCAT('Turnstile Walk-in Ride: ', ?))`,
                    [bandId, ridePrice, attractionId, ride.Attraction_Name]
                );
                debitedAmount = ridePrice;
            }
        }

        // Fetch updated balance
        const [updatedBand] = await adminPool.query(
            `SELECT Wallet_Balance FROM RFID_Wristband WHERE Band_ID = ?`,
            [bandId]
        );
        const newBalance = parseFloat(updatedBand[0]?.Wallet_Balance || 0);

        // Audit log
        await adminPool.query(
            `INSERT INTO Park_Audit_Log (Event_Type, Band_ID, Reference_ID, Description, Logged_At)
             VALUES ('Ride_Tap', ?, ?, CONCAT(?, ' tapped turnstile and boarded ', ?, IF(?, ' (FastPass Verified)', CONCAT(' (Walk-in Fee Debited: ₹', ? ,')'))), NOW())`,
            [bandId, attractionId, visitor.Full_Name, ride.Attraction_Name, passUsed, debitedAmount]
        );

        // Broadcast real-time SSE events
        broadcastEvent('visitor_boarded_ride', {
            bandId: parseInt(bandId, 10),
            visitorName: visitor.Full_Name,
            attractionId: parseInt(attractionId, 10),
            attractionName: ride.Attraction_Name,
            passUsed,
            newBalance,
            timestamp: new Date().toISOString()
        });

        if (debitedAmount > 0) {
            broadcastEvent('wallet_updated', {
                bandId: parseInt(bandId, 10),
                newBalance,
                delta: -debitedAmount,
                type: 'Ride-Debit'
            });
        }

        return res.json({
            success: true,
            status: 'GRANTED',
            message: `Turnstile Unlocked! ${visitor.Full_Name} is now riding "${ride.Attraction_Name}".`,
            visitorName: visitor.Full_Name,
            attractionName: ride.Attraction_Name,
            passUsed,
            debitedAmount,
            newBalance
        });

    } catch (err) {
        return res.status(400).json(formatDatabaseError(err));
    }
});

module.exports = router;
