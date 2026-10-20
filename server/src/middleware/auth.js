/**
 * Authentication & Rate Limiting Middleware
 * Protects admin endpoints with JWT + bcrypt verification
 * Scopes customer endpoints strictly to their authenticated RFID wristband
 */

const jwt = require('jsonwebtoken');
const { customerPool } = require('../config/db');

const JWT_ADMIN_SECRET = process.env.JWT_ADMIN_SECRET || 'smart_theme_park_super_secret_admin_jwt_key_2026';
const JWT_CUSTOMER_SECRET = process.env.JWT_CUSTOMER_SECRET || 'smart_theme_park_super_secret_customer_jwt_key_2026';

// In-memory rate limiting map: ip -> { attempts, lockoutUntil }
const loginAttempts = new Map();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds

function checkLoginRateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const now = Date.now();

    const record = loginAttempts.get(ip) || { attempts: 0, lockoutUntil: 0 };

    if (record.lockoutUntil > now) {
        const remainingSec = Math.ceil((record.lockoutUntil - now) / 1000);
        return res.status(429).json({
            error: true,
            message: `Too many failed login attempts. Account temporarily locked for ${remainingSec} seconds.`,
            remainingSec,
            locked: true
        });
    }

    req.loginRateLimit = {
        recordFailedAttempt: () => {
            record.attempts += 1;
            if (record.attempts >= MAX_ATTEMPTS) {
                record.lockoutUntil = now + LOCKOUT_DURATION_MS;
            }
            loginAttempts.set(ip, record);
        },
        resetAttempts: () => {
            loginAttempts.delete(ip);
        },
        attemptsRemaining: Math.max(0, MAX_ATTEMPTS - record.attempts)
    };

    next();
}

// 1. Verify Admin JWT (httpOnly cookie 'admin_token' or Bearer header)
function verifyAdmin(req, res, next) {
    let token = null;

    if (req.cookies && req.cookies.admin_token) {
        token = req.cookies.admin_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            error: true,
            message: 'Unauthorized: Admin authentication token required. URL guessing prohibited.'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_ADMIN_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: true, message: 'Forbidden: Insufficient privileges.' });
        }
        req.admin = decoded;
        next();
    } catch (err) {
        return res.status(401).json({
            error: true,
            message: 'Invalid or expired admin session. Please log in again.'
        });
    }
}

// 2. Verify Customer JWT (httpOnly cookie 'customer_token' or Bearer header)
async function verifyCustomer(req, res, next) {
    let token = null;

    if (req.cookies && req.cookies.customer_token) {
        token = req.cookies.customer_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            error: true,
            message: 'Unauthorized: Please tap your RFID wristband and enter your PIN.'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_CUSTOMER_SECRET);
        if (!decoded.bandId) {
            return res.status(403).json({ error: true, message: 'Forbidden: Invalid wristband session.' });
        }

        // Check if band is Active or Pending activation
        const [bRows] = await customerPool.query(
            `SELECT Status, Band_UID FROM RFID_Wristband WHERE Band_ID = ?`,
            [decoded.bandId]
        );

        if (!bRows || bRows.length === 0) {
            return res.status(404).json({ error: true, message: 'Wristband record not found.' });
        }

        const bandStatus = bRows[0].Status;
        if (bandStatus === 'Pending') {
            return res.status(403).json({
                error: true,
                accountPending: true,
                bandId: decoded.bandId,
                bandUid: bRows[0].Band_UID || decoded.bandUid,
                status: 'Pending',
                message: 'Account pending activation: admin must allot an amount first.'
            });
        }

        if (bandStatus !== 'Active') {
            return res.status(403).json({
                error: true,
                message: `Account is ${bandStatus}. Access restricted.`
            });
        }

        req.user = decoded; // { bandId, bandUid, visitorId, fullName }
        next();
    } catch (err) {
        return res.status(401).json({
            error: true,
            message: 'Invalid or expired wristband session. Tap your wristband again.'
        });
    }
}

module.exports = {
    checkLoginRateLimit,
    verifyAdmin,
    verifyCustomer,
    JWT_ADMIN_SECRET,
    JWT_CUSTOMER_SECRET
};
