/**
 * Smart Theme Park: Concurrent Dev Launcher
 * Starts both Express Backend (Port 5000) and Vite Frontend (Port 5173).
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('========================================================');
console.log(' STARTING SMART THEME PARK SYSTEM');
console.log(' Backend Port:  http://localhost:5000');
console.log(' Frontend Port: http://localhost:5173');
console.log('========================================================\n');

// 1. Start Server
const serverProcess = spawn('node', ['src/server.js'], {
    cwd: path.join(__dirname, 'server'),
    stdio: 'inherit',
    shell: true
});

// 2. Start Vite Client
const clientProcess = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, 'client'),
    stdio: 'inherit',
    shell: true
});

function handleExit() {
    console.log('\nShutting down dev processes...');
    try { serverProcess.kill(); } catch (e) {}
    try { clientProcess.kill(); } catch (e) {}
    process.exit();
}

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
