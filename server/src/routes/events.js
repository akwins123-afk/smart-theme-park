/**
 * Server-Sent Events (SSE) Bus
 * Provides instant real-time synchronization between Admin Operations
 * and connected Customer wristband viewports.
 */

const express = require('express');
const router = express.Router();
const { setSSEBroadcaster } = require('../config/db');

// List of active SSE client connections: Set of res objects
const clients = new Set();

// Broadcast helper
function broadcastEvent(eventType, payload) {
    const dataString = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of clients) {
        try {
            client.write(dataString);
        } catch (err) {
            console.error('Failed to write to SSE client, dropping connection:', err.message);
            clients.delete(client);
        }
    }
}

// Hook broadcaster into database query instrumentation
setSSEBroadcaster(broadcastEvent);

// SSE connection endpoint
router.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    clients.add(res);

    // Initial greeting / heartbeat
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: new Date().toISOString() })}\n\n`);

    // Keep-alive heartbeat interval every 25 seconds
    const heartbeat = setInterval(() => {
        try {
            res.write(': heartbeat\n\n');
        } catch (e) {
            clearInterval(heartbeat);
        }
    }, 25000);

    req.on('close', () => {
        clearInterval(heartbeat);
        clients.delete(res);
    });
});

module.exports = {
    eventsRouter: router,
    broadcastEvent
};
