/**
 * Smart Theme Park: Express Server Bootstrap
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { eventsRouter, broadcastEvent } = require('./routes/events');
const authRouter = require('./routes/auth');
const customerRouter = require('./routes/customer');
const transparencyRouter = require('./routes/admin/transparency');
const operationsRouter = require('./routes/admin/operations');
const activationRouter = require('./routes/admin/activation');
const { formatDatabaseError } = require('./utils/dbErrorHandler');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { adminPool } = require('./config/db');
const { JWT_CUSTOMER_SECRET } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with credentials for React Vite frontend
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// API Routes
app.use('/api/events', eventsRouter);
app.use('/api/auth', authRouter);
app.use('/api/me', customerRouter);
app.use('/api/admin/transparency', transparencyRouter);
app.use('/api/admin/ops', operationsRouter);
app.use('/api/admin', activationRouter);

// Public Customer Self-Registration: POST /api/register
app.post(['/api/register', '/api/auth/register'], async (req, res) => {
    const { fullName, heightCm, email, phone, pin } = req.body;

    if (!fullName || !heightCm || !pin) {
        return res.status(400).json({ error: true, message: 'Full name, height, and 4-digit PIN are required.' });
    }

    const pinHash = bcrypt.hashSync(pin.toString(), 10);
    const parsedHeight = parseFloat(heightCm);
    const userEmail = email && email.trim() ? email.trim() : `${fullName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${Date.now()}@parkguest.in`;
    const userPhone = phone && phone.trim() ? phone.trim() : 'N/A';

    try {
        await adminPool.query(
            `CALL sp_register_account(?, ?, ?, ?, ?, @out_band_id, @out_band_uid)`,
            [fullName.trim(), parsedHeight, userEmail, userPhone, pinHash]
        );

        const [outRes] = await adminPool.query(`SELECT @out_band_id AS bandId, @out_band_uid AS bandUid`);
        const bandId = outRes[0]?.bandId;
        const bandUid = outRes[0]?.bandUid;

        // Sign JWT token for customer session
        const token = jwt.sign(
            {
                bandId,
                bandUid,
                fullName: fullName.trim(),
                heightCm: parsedHeight
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

        // Broadcast SSE registration event to admin
        broadcastEvent('account_registered', {
            bandId,
            bandUid,
            fullName: fullName.trim(),
            heightCm: parsedHeight,
            email: userEmail,
            phone: userPhone,
            status: 'Pending',
            registeredAt: new Date().toISOString()
        });

        return res.status(201).json({
            success: true,
            bandId,
            bandUid,
            fullName: fullName.trim(),
            status: 'Pending',
            token,
            message: 'Registration successful! Your wristband is Pending activation. Please visit a Top-up Counter.'
        });

    } catch (err) {
        console.error('Registration error:', err);
        return res.status(400).json(formatDatabaseError(err));
    }
});

// System Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        system: 'Smart Theme Park RFID & Virtual Queue Management System',
        database: 'MySQL 8 (smart_theme_park)',
        timestamp: new Date().toISOString()
    });
});

// Public Rides Catalog (For Landing Page Interactive Showcase)
app.get('/api/public/rides', async (req, res) => {
    try {
        const [rows] = await adminPool.query(
            `SELECT Attraction_ID, Attraction_Name, Category, Min_Height_cm, Max_Height_cm, Capacity_Per_Slot, 
                    COALESCE(Thrill_Level, 'Moderate') AS Thrill_Level,
                    COALESCE(Park_Land, 'Wonderla Resort') AS Park_Land, 
                    COALESCE(Ride_Price, 150.00) AS Ride_Price 
             FROM Attraction ORDER BY Attraction_ID ASC`
        );
        res.json({ success: true, rides: rows });
    } catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});

// Centralized error handler fallback
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    if (err.sqlState || err.errno) {
        return res.status(400).json(formatDatabaseError(err));
    }
    res.status(500).json({
        error: true,
        message: err.message || 'Internal Server Error'
    });
});

// Server start listener
app.listen(PORT, () => {
    console.log('========================================================');
    console.log(` SMART THEME PARK BACKEND ACTIVE ON PORT ${PORT}`);
    console.log(` SSE Live Bus: http://localhost:${PORT}/api/events`);
    console.log(` Health Check: http://localhost:${PORT}/api/health`);
    console.log('========================================================');
});
