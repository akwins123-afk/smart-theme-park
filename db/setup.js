/**
 * Smart Theme Park: Complete Database Setup & Migration Runner
 * Sets up smart_theme_park database, executes schema.sql, seeds data,
 * and executes migrations 001 through 006 sequentially.
 */

const fs = require('fs');
const path = require('path');
const serverNodeModules = path.join(__dirname, '../server/node_modules');
if (fs.existsSync(serverNodeModules)) {
    module.paths.push(serverNodeModules);
}
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_ROOT_USER || process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_ROOT_PASSWORD || process.env.DB_PASSWORD || 'Akash359$';
const DB_NAME = process.env.DB_NAME || 'smart_theme_park';

// Helper to execute SQL scripts with DELIMITER handling
async function executeSqlFile(connection, filePath) {
    const rawSql = fs.readFileSync(filePath, 'utf-8');
    console.log(`Executing ${path.basename(filePath)}...`);

    // Remove single line comments (-- ...) and empty lines
    const lines = rawSql.replace(/\r\n/g, '\n').split('\n');
    const filteredLines = [];
    for (let line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('--') && !trimmed.startsWith('-- =')) {
            continue;
        }
        if (trimmed.startsWith('-- =')) {
            continue;
        }
        filteredLines.push(line);
    }

    const blocks = [];
    let currentDelimiter = ';';
    let currentBlock = [];

    for (let line of filteredLines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('DELIMITER $$')) {
            currentDelimiter = '$$';
            continue;
        } else if (trimmed.startsWith('DELIMITER ;')) {
            currentDelimiter = ';';
            continue;
        }

        if (currentDelimiter === '$$') {
            if (trimmed.endsWith('$$')) {
                currentBlock.push(line.replace(/\$\$$/, ''));
                const stmt = currentBlock.join('\n').trim();
                if (stmt) blocks.push(stmt);
                currentBlock = [];
            } else {
                currentBlock.push(line);
            }
        } else {
            if (trimmed.endsWith(';')) {
                currentBlock.push(line.slice(0, line.lastIndexOf(';')));
                const stmt = currentBlock.join('\n').trim();
                if (stmt) blocks.push(stmt);
                currentBlock = [];
            } else {
                currentBlock.push(line);
            }
        }
    }
    if (currentBlock.join('\n').trim()) {
        blocks.push(currentBlock.join('\n').trim());
    }

    for (let stmt of blocks) {
        const cleaned = stmt.trim();
        if (!cleaned) continue;
        try {
            await connection.query(cleaned);
        } catch (err) {
            // Ignore duplicate index errors on re-seed
            if (err.errno === 1061 || err.code === 'ER_DUP_KEYNAME') {
                continue;
            }
            console.error(`Error executing statement:\n${cleaned.substring(0, 150)}...\nMessage: ${err.message}`);
            throw err;
        }
    }
    console.log(`✔ Finished ${path.basename(filePath)}`);
}

async function runSetup() {
    console.log('====================================================');
    console.log(' SMART THEME PARK: DATABASE INITIALIZATION & MIGRATIONS');
    console.log('====================================================');
    console.log(`Connecting to MySQL at ${DB_HOST}:${DB_PORT} as user '${DB_USER}'...`);

    let rootConn;
    try {
        rootConn = await mysql.createConnection({
            host: DB_HOST,
            port: DB_PORT,
            user: DB_USER,
            password: DB_PASSWORD,
            multipleStatements: true
        });
        console.log('✔ Connected to MySQL successfully!');
    } catch (err) {
        console.error('❌ Failed to connect to MySQL:', err.message);
        process.exit(1);
    }

    try {
        // 1. Run schema.sql
        const schemaPath = path.join(__dirname, 'schema.sql');
        await executeSqlFile(rootConn, schemaPath);

        // Switch connection to smart_theme_park database
        await rootConn.changeUser({ database: DB_NAME });

        // 2. Run seed.sql
        const seedPath = path.join(__dirname, 'seed.sql');
        await executeSqlFile(rootConn, seedPath);

        // 3. Run all migrations in order
        const migrationsDir = path.join(__dirname, 'migrations');
        if (fs.existsSync(migrationsDir)) {
            const migrationFiles = fs.readdirSync(migrationsDir)
                .filter(f => f.endsWith('.sql'))
                .sort();

            console.log(`\nFound ${migrationFiles.length} migration(s)...`);
            for (const mig of migrationFiles) {
                const migPath = path.join(migrationsDir, mig);
                await executeSqlFile(rootConn, migPath);
            }
        }

        // 4. Verification & Status Report
        console.log('\n====================================================');
        console.log(' VERIFICATION SUMMARY');
        console.log('====================================================');

        const [tables] = await rootConn.query(`
            SELECT table_name, table_rows 
            FROM information_schema.tables 
            WHERE table_schema = ?
        `, [DB_NAME]);

        console.log('Tables & Views in database:');
        tables.forEach(t => console.log(`  - ${t.TABLE_NAME} (approx rows: ${t.TABLE_ROWS})`));

        const [procedures] = await rootConn.query(`
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = ? AND routine_type = 'PROCEDURE'
        `, [DB_NAME]);

        console.log('\nStored Procedures:');
        procedures.forEach(p => console.log(`  - ${p.ROUTINE_NAME}`));

        const [triggers] = await rootConn.query(`
            SELECT trigger_name, event_manipulation, event_object_table 
            FROM information_schema.triggers 
            WHERE trigger_schema = ?
        `, [DB_NAME]);

        console.log('\nTriggers:');
        triggers.forEach(trg => console.log(`  - ${trg.TRIGGER_NAME} on ${trg.EVENT_OBJECT_TABLE} (${trg.EVENT_MANIPULATION})`));

        console.log('\n✔ All tables, views, triggers, and stored procedures are ready!');
        console.log('====================================================\n');

    } catch (err) {
        console.error('❌ Error during setup:', err);
        process.exit(1);
    } finally {
        if (rootConn) await rootConn.end();
    }
}

runSetup();
