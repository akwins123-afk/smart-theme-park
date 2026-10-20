/**
 * Admin Account Activation & Opening Float Allotment Routes
 * Strictly protected by verifyAdmin JWT middleware.
 */

const express = require('express');
const router = express.Router();
const { adminPool, trackedQuery } = require('../../config/db');
const { verifyAdmin } = require('../../middleware/auth');
const { broadcastEvent } = require('../events');
const { formatDatabaseError } = require('../../utils/dbErrorHandler');

// Enforce admin JWT verification
router.use(verifyAdmin);

// ==========================================
// 1. GET PENDING ACCOUNTS
// ==========================================
router.get('/pending', async (req, res) => {
    try {
        const [rows] = await trackedQuery(
            adminPool,
            `SELECT 
                w.Band_ID,
                w.Band_UID,
                w.Status,
                w.Wallet_Balance,
                v.Visitor_ID,
                v.Full_Name,
                v.Height_cm,
                v.Email,
                v.Phone,
                v.Registration_Date
             FROM RFID_Wristband w
             JOIN Visitor v ON w.Visitor_ID = v.Visitor_ID
             WHERE w.Status = 'Pending'
             ORDER BY w.Band_ID DESC`,
            [],
            'GET /api/admin/pending'
        );

        return res.json({
            success: true,
            count: rows.length,
            pending: rows
        });
    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

// ==========================================
// 2. GET ACTIVATION HISTORY
// ==========================================
router.get('/activations', async (req, res) => {
    try {
        const [rows] = await trackedQuery(
            adminPool,
            `SELECT 
                a.Activation_ID,
                a.Band_ID,
                w.Band_UID,
                v.Full_Name,
                a.Opening_Amount,
                a.Allocated_By,
                a.Allocated_At,
                a.Payment_Mode,
                a.Remarks
             FROM Account_Activation a
             JOIN RFID_Wristband w ON a.Band_ID = w.Band_ID
             JOIN Visitor v ON w.Visitor_ID = v.Visitor_ID
             ORDER BY a.Activation_ID DESC`,
            [],
            'GET /api/admin/activations'
        );

        return res.json({
            success: true,
            activations: rows
        });
    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

// ==========================================
// 3. POST ACTIVATE ACCOUNT (ALLOT OPENING AMOUNT)
// ==========================================
router.post('/activate', async (req, res) => {
    const { bandId, amount, paymentMode = 'Cash', remarks = 'Front Counter Activation' } = req.body;

    if (!bandId || !amount) {
        return res.status(400).json({ error: true, message: 'Wristband ID and Opening Amount are required.' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ error: true, message: 'Opening Amount must be greater than zero.' });
    }

    const adminName = req.admin?.user || 'Park Admin';

    try {
        // Fetch band details before activating
        const [bandRows] = await adminPool.query(
            `SELECT w.Band_ID, w.Band_UID, w.Status, v.Full_Name 
             FROM RFID_Wristband w 
             JOIN Visitor v ON w.Visitor_ID = v.Visitor_ID 
             WHERE w.Band_ID = ?`,
            [bandId]
        );

        if (!bandRows || bandRows.length === 0) {
            return res.status(404).json({ error: true, message: 'Wristband not found.' });
        }

        const band = bandRows[0];

        // Call stored procedure sp_activate_account
        await adminPool.query(
            `CALL sp_activate_account(?, ?, ?, ?, ?)`,
            [bandId, numericAmount, adminName, paymentMode, remarks]
        );

        // Fetch updated balance
        const [updatedBand] = await adminPool.query(
            `SELECT Wallet_Balance, Status FROM RFID_Wristband WHERE Band_ID = ?`,
            [bandId]
        );
        const newBalance = parseFloat(updatedBand[0]?.Wallet_Balance || numericAmount);

        // Broadcast SSE activation event directly to customer screen & admin monitor
        broadcastEvent('account_activated', {
            bandId: parseInt(bandId, 10),
            bandUid: band.Band_UID,
            visitorName: band.Full_Name,
            openingAmount: numericAmount,
            newBalance,
            paymentMode,
            allocatedBy: adminName,
            status: 'Active',
            timestamp: new Date().toISOString()
        });

        broadcastEvent('wallet_updated', {
            bandId: parseInt(bandId, 10),
            newBalance,
            delta: numericAmount,
            type: 'Top-up'
        });

        return res.json({
            success: true,
            status: 'Active',
            message: `Account ${band.Band_UID} (${band.Full_Name}) successfully activated with ₹${numericAmount.toFixed(2)} opening float!`,
            receipt: {
                bandId: band.Band_ID,
                bandUid: band.Band_UID,
                visitorName: band.Full_Name,
                openingAmount: numericAmount,
                allocatedBy: adminName,
                paymentMode,
                allocatedAt: new Date().toISOString()
            }
        });

    } catch (err) {
        return res.status(400).json(formatDatabaseError(err));
    }
});

// ==========================================
// 4. DELETE REJECT PENDING ACCOUNT
// ==========================================
router.delete('/pending/:id', async (req, res) => {
    const bandId = req.params.id;

    try {
        const [bRows] = await adminPool.query(
            `SELECT w.Band_ID, w.Band_UID, w.Status, w.Visitor_ID, v.Full_Name 
             FROM RFID_Wristband w 
             JOIN Visitor v ON w.Visitor_ID = v.Visitor_ID 
             WHERE w.Band_ID = ?`,
            [bandId]
        );

        if (!bRows || bRows.length === 0) {
            return res.status(404).json({ error: true, message: 'Pending account not found.' });
        }

        const record = bRows[0];
        if (record.Status !== 'Pending') {
            return res.status(400).json({ error: true, message: 'Cannot reject non-pending account.' });
        }

        // Delete visitor (cascades to RFID_Wristband)
        await adminPool.query(`DELETE FROM Visitor WHERE Visitor_ID = ?`, [record.Visitor_ID]);

        broadcastEvent('account_rejected', {
            bandId: parseInt(bandId, 10),
            bandUid: record.Band_UID,
            fullName: record.Full_Name
        });

        return res.json({
            success: true,
            message: `Pending registration for ${record.Full_Name} (${record.Band_UID}) was rejected.`
        });

    } catch (err) {
        return res.status(400).json(formatDatabaseError(err));
    }
});

module.exports = router;
