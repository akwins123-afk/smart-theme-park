/**
 * Authentication Routes (Admin Gate & Customer Wristband Tap)
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { adminPool, customerPool, trackedQuery } = require('../config/db');
const { 
    checkLoginRateLimit, 
    verifyAdmin, 
    verifyCustomer,
    JWT_ADMIN_SECRET, 
    JWT_CUSTOMER_SECRET 
} = require('../middleware/auth');

const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '$2a$10$Py1zsW0kRDXJxTtbA7P6Kelh5UI.AxsAb9nh6q1AWf9gVkmaLTmB.';

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

router.post('/admin/login', checkLoginRateLimit, async (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: true, message: 'Password is required.', shake: true });
    }

    const isValid = bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);

    if (!isValid) {
        req.loginRateLimit.recordFailedAttempt();
        return res.status(401).json({
            error: true,
            shake: true,
            message: 'Invalid administrative password.',
            attemptsRemaining: req.loginRateLimit.attemptsRemaining
        });
    }

    req.loginRateLimit.resetAttempts();

    const token = jwt.sign(
        { role: 'admin', user: 'Park SuperAdmin' },
        JWT_ADMIN_SECRET,
        { expiresIn: '2h' }
    );

    res.cookie('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 2 * 60 * 60 * 1000 // 2 hours
    });

    return res.json({
        success: true,
        message: 'Admin access authorized.',
        token,
        role: 'admin'
    });
});

router.post('/admin/logout', (req, res) => {
    res.clearCookie('admin_token');
    return res.json({ success: true, message: 'Logged out successfully.' });
});

router.get('/admin/verify', verifyAdmin, (req, res) => {
    return res.json({ success: true, authenticated: true, admin: req.admin });
});

// ==========================================
// CUSTOMER AUTHENTICATION (RFID TAP + PIN)
// ==========================================

// Returns demo wristbands for instant 1-click tap in demo mode
router.get('/customer/demo-wristbands', async (req, res) => {
    try {
        const [rows] = await trackedQuery(
            adminPool,
            `SELECT 
                w.Band_ID,
                w.Band_UID,
                w.Wallet_Balance,
                w.Status,
                v.Visitor_ID,
                v.Full_Name,
                v.Height_cm
            FROM RFID_Wristband w
            JOIN Visitor v ON w.Visitor_ID = v.Visitor_ID
            ORDER BY w.Band_ID ASC`,
            [],
            'GET /api/auth/customer/demo-wristbands'
        );
        return res.json({ success: true, wristbands: rows });
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message });
    }
});

// Customer Login: Tap wristband (Band_UID) + 4-digit PIN
router.post('/customer/login', async (req, res) => {
    const { bandUid, pin } = req.body;

    if (!bandUid || !pin) {
        return res.status(400).json({ error: true, message: 'Band UID and 4-digit PIN are required.' });
    }

    try {
        const [rows] = await trackedQuery(
            adminPool,
            `SELECT 
                w.Band_ID,
                w.Band_UID,
                w.Wallet_Balance,
                w.Status,
                w.Pin_Hash,
                v.Visitor_ID,
                v.Full_Name,
                v.Height_cm
            FROM RFID_Wristband w
            JOIN Visitor v ON w.Visitor_ID = v.Visitor_ID
            WHERE w.Band_UID = ?`,
            [bandUid.trim()],
            'POST /api/auth/customer/login'
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({
                error: true,
                message: `Wristband UID "${bandUid}" not recognized. Please verify with Park Guest Relations.`
            });
        }

        const band = rows[0];

        if (band.Status === 'Lost') {
            return res.status(403).json({
                error: true,
                message: 'This wristband has been reported Lost and deactivated for safety.'
            });
        }

        // Verify PIN (matches bcrypt hash, or default demo PIN 1234)
        let pinValid = false;
        if (band.Pin_Hash) {
            pinValid = bcrypt.compareSync(pin.toString(), band.Pin_Hash) || pin.toString() === '1234';
        } else {
            pinValid = pin.toString() === '1234';
        }

        if (!pinValid) {
            return res.status(401).json({
                error: true,
                message: 'Incorrect 4-digit PIN for this wristband (Demo PIN is 1234).'
            });
        }

        const token = jwt.sign(
            {
                bandId: band.Band_ID,
                bandUid: band.Band_UID,
                visitorId: band.Visitor_ID,
                fullName: band.Full_Name,
                heightCm: band.Height_cm
            },
            JWT_CUSTOMER_SECRET,
            { expiresIn: '6h' }
        );

        res.cookie('customer_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 6 * 60 * 60 * 1000
        });

        return res.json({
            success: true,
            message: `Welcome, ${band.Full_Name}!`,
            token,
            user: {
                bandId: band.Band_ID,
                bandUid: band.Band_UID,
                visitorId: band.Visitor_ID,
                fullName: band.Full_Name,
                heightCm: band.Height_cm,
                walletBalance: parseFloat(band.Wallet_Balance),
                status: band.Status
            }
        });

    } catch (err) {
        console.error('Customer login error:', err);
        return res.status(500).json({ error: true, message: err.message });
    }
});

router.post('/customer/logout', (req, res) => {
    res.clearCookie('customer_token');
    return res.json({ success: true, message: 'Customer session ended.' });
});

router.get('/customer/verify', verifyCustomer, async (req, res) => {
    try {
        const [rows] = await trackedQuery(
            customerPool,
            `SELECT 
                w.Band_ID,
                w.Band_UID,
                w.Wallet_Balance,
                w.Status,
                v.Visitor_ID,
                v.Full_Name,
                v.Height_cm
            FROM RFID_Wristband w
            JOIN Visitor v ON w.Visitor_ID = v.Visitor_ID
            WHERE w.Band_ID = ?`,
            [req.user.bandId],
            'GET /api/auth/customer/verify'
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: true, message: 'Wristband profile not found.' });
        }

        const band = rows[0];
        return res.json({
            success: true,
            user: {
                bandId: band.Band_ID,
                bandUid: band.Band_UID,
                visitorId: band.Visitor_ID,
                fullName: band.Full_Name,
                heightCm: band.Height_cm,
                walletBalance: parseFloat(band.Wallet_Balance),
                status: band.Status
            }
        });
    } catch (err) {
        return res.status(500).json({ error: true, message: err.message });
    }
});

module.exports = router;
