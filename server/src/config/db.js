/**
 * Database Connection Pools & Query Instrumenter
 * Provides isolated pools for Admin (full) and Customer (least-privilege).
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_NAME = process.env.DB_NAME || 'smart_theme_park';

// SSE Event emitter callback reference
let sseBroadcaster = null;

function setSSEBroadcaster(broadcaster) {
    sseBroadcaster = broadcaster;
}

// 1. Admin Pool: full privileges
const adminPool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: process.env.DB_ADMIN_USER || process.env.DB_ROOT_USER || 'root',
    password: process.env.DB_ADMIN_PASSWORD || process.env.DB_ROOT_PASSWORD || 'Akash359$',
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    multipleStatements: true,
    timezone: '+05:30'
});

// 2. Customer Pool: least privilege (SELECT on safe views, EXECUTE on customer SPs)
const customerPool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: process.env.DB_CUSTOMER_USER || 'park_customer',
    password: process.env.DB_CUSTOMER_PASSWORD || 'CustomerPass@2026',
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    timezone: '+05:30'
});

// Query wrapper with real-time execution timing & live SQL inspector broadcast
async function trackedQuery(pool, sql, params = [], context = 'API') {
    const startTime = performance.now();
    let success = true;
    let errorMessage = null;
    let result = null;

    try {
        result = await pool.query(sql, params);
        return result;
    } catch (err) {
        success = false;
        errorMessage = err.message;
        throw err;
    } finally {
        const durationMs = (performance.now() - startTime).toFixed(2);
        
        // Broadcast to admin live SQL inspector drawer
        if (sseBroadcaster) {
            sseBroadcaster('sql_executed', {
                sql: typeof sql === 'string' ? sql.trim() : JSON.stringify(sql),
                params: params || [],
                durationMs: parseFloat(durationMs),
                timestamp: new Date().toISOString(),
                context,
                success,
                errorMessage,
                user: pool === customerPool ? 'park_customer' : 'park_admin'
            });
        }
    }
}

module.exports = {
    adminPool,
    customerPool,
    trackedQuery,
    setSSEBroadcaster,
    DB_NAME
};
