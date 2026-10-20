/**
 * Admin: Database Transparency Center (/api/admin/transparency/*)
 * Exposes live data grids, dynamic CRUD, schema DDL, ER diagram,
 * guarded SQL console with EXPLAIN, analytical queries gallery,
 * index lab, and role privileges.
 */

const express = require('express');
const router = express.Router();
const { adminPool, customerPool, trackedQuery, DB_NAME } = require('../../config/db');
const { verifyAdmin } = require('../../middleware/auth');
const { formatDatabaseError } = require('../../utils/dbErrorHandler');

// Enforce admin JWT
router.use(verifyAdmin);

// Whitelist of valid manageable tables
const MANAGED_TABLES = [
    'Visitor',
    'RFID_Wristband',
    'Attraction',
    'Virtual_Queue_Pass',
    'Locker',
    'Locker_Rental',
    'POS_Outlet',
    'Wallet_Transaction',
    'Account_Activation',
    'Park_Audit_Log'
];

// ==========================================
// 1. TABLE LIST & METADATA
// ==========================================
router.get('/tables', async (req, res) => {
    try {
        const [tables] = await trackedQuery(
            adminPool,
            `SELECT 
                TABLE_NAME, 
                TABLE_TYPE, 
                ENGINE, 
                TABLE_ROWS, 
                CREATE_TIME 
             FROM INFORMATION_SCHEMA.TABLES 
             WHERE TABLE_SCHEMA = ?
             ORDER BY TABLE_TYPE, TABLE_NAME`,
            [DB_NAME],
            'Admin: List Tables'
        );

        // Fetch accurate row counts for all base tables
        const counts = {};
        for (const tbl of MANAGED_TABLES) {
            try {
                const [r] = await adminPool.query(`SELECT COUNT(*) as count FROM \`${tbl}\``);
                counts[tbl] = r[0].count;
            } catch (e) {
                counts[tbl] = 0;
            }
        }

        const enrichedTables = tables.map(t => ({
            name: t.TABLE_NAME,
            type: t.TABLE_TYPE === 'VIEW' ? 'VIEW' : 'BASE TABLE',
            engine: t.ENGINE || 'N/A',
            rowCount: counts[t.TABLE_NAME] !== undefined ? counts[t.TABLE_NAME] : t.TABLE_ROWS,
            created: t.CREATE_TIME
        }));

        return res.json({ success: true, tables: enrichedTables });

    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

// ==========================================
// 2. LIVE DATA GRID FOR A SPECIFIC TABLE
// ==========================================
router.get('/table/:tableName', async (req, res) => {
    const { tableName } = req.params;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '15', 10);
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || '';
    const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    const search = req.query.search || '';

    // Security whitelist check
    const matchedTable = MANAGED_TABLES.find(t => t.toLowerCase() === tableName.toLowerCase());
    if (!matchedTable) {
        return res.status(400).json({ error: true, message: `Table "${tableName}" is not allowed or does not exist.` });
    }

    try {
        // Fetch Column Metadata (Types, PK, Nullable, Default, Key)
        const [columns] = await adminPool.query(
            `SELECT 
                COLUMN_NAME, 
                DATA_TYPE, 
                COLUMN_TYPE, 
                IS_NULLABLE, 
                COLUMN_KEY, 
                COLUMN_DEFAULT, 
                EXTRA
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
             ORDER BY ORDINAL_POSITION`,
            [DB_NAME, matchedTable]
        );

        // Fetch Foreign Key Constraints
        const [fkInfo] = await adminPool.query(
            `SELECT 
                COLUMN_NAME, 
                REFERENCED_TABLE_NAME, 
                REFERENCED_COLUMN_NAME 
             FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
            [DB_NAME, matchedTable]
        );

        const fkMap = {};
        fkInfo.forEach(fk => {
            fkMap[fk.COLUMN_NAME] = {
                targetTable: fk.REFERENCED_TABLE_NAME,
                targetColumn: fk.REFERENCED_COLUMN_NAME
            };
        });

        // Build Search Clause
        let whereClause = '';
        const params = [];
        if (search) {
            const searchableCols = columns.filter(c => ['varchar', 'text', 'int', 'decimal', 'enum'].includes(c.DATA_TYPE));
            if (searchableCols.length > 0) {
                const searchLikes = searchableCols.map(c => `\`${c.COLUMN_NAME}\` LIKE ?`).join(' OR ');
                whereClause = `WHERE (${searchLikes})`;
                for (let i = 0; i < searchableCols.length; i++) {
                    params.push(`%${search}%`);
                }
            }
        }

        // Determine Order
        let orderByClause = '';
        if (sortBy && columns.some(c => c.COLUMN_NAME === sortBy)) {
            orderByClause = `ORDER BY \`${sortBy}\` ${sortOrder}`;
        } else {
            const pk = columns.find(c => c.COLUMN_KEY === 'PRI');
            if (pk) {
                orderByClause = `ORDER BY \`${pk.COLUMN_NAME}\` DESC`;
            }
        }

        // Count Total
        const [countRes] = await adminPool.query(
            `SELECT COUNT(*) AS total FROM \`${matchedTable}\` ${whereClause}`,
            params
        );
        const totalRows = countRes[0]?.total || 0;

        // Fetch Rows
        const [rows] = await trackedQuery(
            adminPool,
            `SELECT * FROM \`${matchedTable}\` ${whereClause} ${orderByClause} LIMIT ? OFFSET ?`,
            [...params, limit, offset],
            `Data Grid: ${matchedTable}`
        );

        return res.json({
            success: true,
            tableName: matchedTable,
            columns: columns.map(c => ({
                name: c.COLUMN_NAME,
                type: c.DATA_TYPE,
                columnType: c.COLUMN_TYPE,
                nullable: c.IS_NULLABLE === 'YES',
                key: c.COLUMN_KEY,
                defaultValue: c.COLUMN_DEFAULT,
                extra: c.EXTRA,
                foreignKey: fkMap[c.COLUMN_NAME] || null
            })),
            rows,
            pagination: {
                page,
                limit,
                totalRows,
                totalPages: Math.ceil(totalRows / limit)
            }
        });

    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

// ==========================================
// 3. DYNAMIC FK OPTIONS FOR AUTO-GENERATED FORMS
// ==========================================
router.get('/foreign-key-options/:tableName', async (req, res) => {
    const { tableName } = req.params;
    const matchedTable = MANAGED_TABLES.find(t => t.toLowerCase() === tableName.toLowerCase());
    if (!matchedTable) {
        return res.status(400).json({ error: true, message: 'Invalid table' });
    }

    try {
        let sql = '';
        if (matchedTable === 'Visitor') {
            sql = `SELECT Visitor_ID AS id, CONCAT(Full_Name, ' (', Height_cm, 'cm)') AS label FROM Visitor ORDER BY Full_Name`;
        } else if (matchedTable === 'RFID_Wristband') {
            sql = `SELECT w.Band_ID AS id, CONCAT(w.Band_UID, ' - ', v.Full_Name, ' (₹', w.Wallet_Balance, ')') AS label 
                   FROM RFID_Wristband w 
                   JOIN Visitor v ON w.Visitor_ID = v.Visitor_ID 
                   ORDER BY w.Band_ID`;
        } else if (matchedTable === 'Attraction') {
            sql = `SELECT Attraction_ID AS id, CONCAT(Attraction_Name, ' (', Category, ', Min ', Min_Height_cm, 'cm)') AS label FROM Attraction ORDER BY Attraction_Name`;
        } else if (matchedTable === 'Locker') {
            sql = `SELECT Locker_ID AS id, CONCAT(Zone, ' - Locker ', Number) AS label FROM Locker ORDER BY Zone, Number`;
        } else if (matchedTable === 'POS_Outlet') {
            sql = `SELECT Outlet_ID AS id, CONCAT(Outlet_Name, ' (', Type, ')') AS label FROM POS_Outlet ORDER BY Outlet_Name`;
        } else {
            return res.json({ success: true, options: [] });
        }

        const [rows] = await adminPool.query(sql);
        return res.json({ success: true, options: rows });

    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

// ==========================================
// 4. DYNAMIC CRUD (INSERT, UPDATE, DELETE)
// ==========================================

function sanitizeCrudPayload(payload, isInsert = true, pkCol = null) {
    const cleaned = {};
    for (const [key, val] of Object.entries(payload)) {
        if (!isInsert && key === pkCol) continue;

        // If field is empty string or undefined
        if (val === undefined || val === null || val === '') {
            if (isInsert) {
                // omit key so MySQL default (e.g. CURRENT_TIMESTAMP or AUTO_INCREMENT) takes over
                continue;
            } else {
                cleaned[key] = null;
                continue;
            }
        }

        if (typeof val === 'string') {
            const trimmed = val.trim();
            // Automatically convert DD-MM-YYYY or DD/MM/YYYY into YYYY-MM-DD
            const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?$/);
            if (dmyMatch) {
                const day = dmyMatch[1].padStart(2, '0');
                const month = dmyMatch[2].padStart(2, '0');
                const year = dmyMatch[3];
                const time = dmyMatch[4] ? (dmyMatch[4].length === 5 ? dmyMatch[4] + ':00' : dmyMatch[4]) : '00:00:00';
                cleaned[key] = `${year}-${month}-${day} ${time}`;
                continue;
            }
            cleaned[key] = trimmed;
        } else {
            cleaned[key] = val;
        }
    }
    return cleaned;
}

router.post('/table/:tableName', async (req, res) => {
    const { tableName } = req.params;
    const matchedTable = MANAGED_TABLES.find(t => t.toLowerCase() === tableName.toLowerCase());
    if (!matchedTable) return res.status(400).json({ error: true, message: 'Invalid table' });

    const payload = sanitizeCrudPayload(req.body, true);
    try {
        const keys = Object.keys(payload);
        const values = Object.values(payload);

        if (keys.length === 0) {
            return res.status(400).json({ error: true, message: 'No record data provided.' });
        }

        const columnsSql = keys.map(k => `\`${k}\``).join(', ');
        const placeholders = keys.map(() => '?').join(', ');

        const [result] = await trackedQuery(
            adminPool,
            `INSERT INTO \`${matchedTable}\` (${columnsSql}) VALUES (${placeholders})`,
            values,
            `Insert into ${matchedTable}`
        );

        return res.json({
            success: true,
            message: `Record successfully inserted into ${matchedTable}!`,
            insertId: result.insertId
        });

    } catch (err) {
        return res.status(400).json(formatDatabaseError(err));
    }
});

router.put('/table/:tableName/:id', async (req, res) => {
    const { tableName, id } = req.params;
    const matchedTable = MANAGED_TABLES.find(t => t.toLowerCase() === tableName.toLowerCase());
    if (!matchedTable) return res.status(400).json({ error: true, message: 'Invalid table' });

    try {
        const [cols] = await adminPool.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_KEY = 'PRI'`,
            [DB_NAME, matchedTable]
        );
        const pkCol = cols[0]?.COLUMN_NAME;
        if (!pkCol) return res.status(400).json({ error: true, message: 'Table has no primary key.' });

        const payload = sanitizeCrudPayload(req.body, false, pkCol);
        const keys = Object.keys(payload);
        if (keys.length === 0) return res.status(400).json({ error: true, message: 'No fields to update.' });

        const setSql = keys.map(k => `\`${k}\` = ?`).join(', ');
        const values = keys.map(k => payload[k]);
        values.push(id);

        await trackedQuery(
            adminPool,
            `UPDATE \`${matchedTable}\` SET ${setSql} WHERE \`${pkCol}\` = ?`,
            values,
            `Update ${matchedTable} #${id}`
        );

        return res.json({ success: true, message: `Record #${id} in ${matchedTable} updated successfully.` });

    } catch (err) {
        return res.status(400).json(formatDatabaseError(err));
    }
});

router.delete('/table/:tableName/:id', async (req, res) => {
    const { tableName, id } = req.params;
    const matchedTable = MANAGED_TABLES.find(t => t.toLowerCase() === tableName.toLowerCase());
    if (!matchedTable) return res.status(400).json({ error: true, message: 'Invalid table' });

    try {
        const [cols] = await adminPool.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_KEY = 'PRI'`,
            [DB_NAME, matchedTable]
        );
        const pkCol = cols[0]?.COLUMN_NAME;
        if (!pkCol) return res.status(400).json({ error: true, message: 'Table has no primary key.' });

        await trackedQuery(
            adminPool,
            `DELETE FROM \`${matchedTable}\` WHERE \`${pkCol}\` = ?`,
            [id],
            `Delete from ${matchedTable} #${id}`
        );

        return res.json({ success: true, message: `Record #${id} deleted from ${matchedTable}.` });

    } catch (err) {
        return res.status(400).json(formatDatabaseError(err));
    }
});

// ==========================================
// 5. SCHEMA & DDL VIEWER + 3NF EXPLANATION
// ==========================================
router.get('/schema', async (req, res) => {
    try {
        const ddlMap = {};

        // Tables
        for (const tbl of MANAGED_TABLES) {
            try {
                const [r] = await adminPool.query(`SHOW CREATE TABLE \`${tbl}\``);
                ddlMap[tbl] = r[0]['Create Table'];
            } catch (e) {
                ddlMap[tbl] = `/* Error reading DDL: ${e.message} */`;
            }
        }

        // Views
        const [views] = await adminPool.query(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = ?`,
            [DB_NAME]
        );
        const viewDdls = {};
        for (const v of views) {
            try {
                const [r] = await adminPool.query(`SHOW CREATE VIEW \`${v.TABLE_NAME}\``);
                viewDdls[v.TABLE_NAME] = r[0]['Create View'];
            } catch (e) {
                viewDdls[v.TABLE_NAME] = e.message;
            }
        }

        // Triggers
        const [triggers] = await adminPool.query(
            `SELECT TRIGGER_NAME FROM INFORMATION_SCHEMA.TRIGGERS WHERE TRIGGER_SCHEMA = ?`,
            [DB_NAME]
        );
        const triggerDdls = {};
        for (const t of triggers) {
            try {
                const [r] = await adminPool.query(`SHOW CREATE TRIGGER \`${t.TRIGGER_NAME}\``);
                triggerDdls[t.TRIGGER_NAME] = r[0]['SQL Original Statement'];
            } catch (e) {
                triggerDdls[t.TRIGGER_NAME] = e.message;
            }
        }

        // Stored Procedures
        const [procedures] = await adminPool.query(
            `SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE'`,
            [DB_NAME]
        );
        const procedureDdls = {};
        for (const p of procedures) {
            try {
                const [r] = await adminPool.query(`SHOW CREATE PROCEDURE \`${p.ROUTINE_NAME}\``);
                procedureDdls[p.ROUTINE_NAME] = r[0]['Create Procedure'];
            } catch (e) {
                procedureDdls[p.ROUTINE_NAME] = e.message;
            }
        }

        // 3NF Justification
        const normalizationDoc = {
            title: 'Third Normal Form (3NF) Compliance Report',
            summary: 'The schema satisfies 1NF, 2NF, and 3NF across all entities without functional redundancy.',
            forms: [
                {
                    nf: '1NF (First Normal Form)',
                    status: 'Compliant',
                    details: 'All column domains are atomic. Multi-valued attributes like phone/email are single scalars per row. Every table possesses an explicit surrogate PRIMARY KEY.'
                },
                {
                    nf: '2NF (Second Normal Form)',
                    status: 'Compliant',
                    details: 'Every non-key attribute is fully functionally dependent on the entire primary key. In associative tables (Virtual_Queue_Pass, Locker_Rental), surrogate keys (Pass_ID, Rental_ID) prevent partial dependencies.'
                },
                {
                    nf: '3NF (Third Normal Form)',
                    status: 'Compliant',
                    details: 'No transitive dependencies exist (X → Y → Z). For example, attraction details (Name, Min_Height) reside exclusively in Attraction; Virtual_Queue_Pass holds only Attraction_ID. Similarly, POS outlet names reside only in POS_Outlet, referenced via Outlet_ID.'
                }
            ]
        };

        return res.json({
            success: true,
            tables: ddlMap,
            views: viewDdls,
            triggers: triggerDdls,
            procedures: procedureDdls,
            normalizationDoc
        });

    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

// ==========================================
// 6. INTERACTIVE ER DIAGRAM (REACT FLOW FORMAT)
// ==========================================
router.get('/er-diagram', async (req, res) => {
    try {
        // Node definitions with coordinates and attribute lists
        const nodes = [
            {
                id: 'Visitor',
                position: { x: 50, y: 50 },
                data: {
                    label: 'Visitor',
                    badge: 'Entity',
                    attributes: [
                        { name: 'Visitor_ID', type: 'INT', isPk: true },
                        { name: 'Full_Name', type: 'VARCHAR(100)' },
                        { name: 'Height_cm', type: 'DECIMAL(5,1)', check: '> 0' },
                        { name: 'Email', type: 'VARCHAR(100)', isUq: true },
                        { name: 'Phone', type: 'VARCHAR(20)' },
                        { name: 'Registration_Date', type: 'DATETIME' }
                    ]
                }
            },
            {
                id: 'RFID_Wristband',
                position: { x: 450, y: 50 },
                data: {
                    label: 'RFID_Wristband',
                    badge: 'Entity (1:1)',
                    attributes: [
                        { name: 'Band_ID', type: 'INT', isPk: true },
                        { name: 'Band_UID', type: 'VARCHAR(20)', isUq: true },
                        { name: 'Visitor_ID', type: 'INT', isFk: true, isUq: true },
                        { name: 'Wallet_Balance', type: 'DECIMAL(10,2)', check: '>= 0' },
                        { name: 'Status', type: 'ENUM' },
                        { name: 'Pin_Hash', type: 'VARCHAR(255)' }
                    ]
                }
            },
            {
                id: 'Attraction',
                position: { x: 850, y: 50 },
                data: {
                    label: 'Attraction',
                    badge: 'Entity',
                    attributes: [
                        { name: 'Attraction_ID', type: 'INT', isPk: true },
                        { name: 'Attraction_Name', type: 'VARCHAR(100)' },
                        { name: 'Category', type: 'ENUM' },
                        { name: 'Min_Height_cm', type: 'DECIMAL(5,1)' },
                        { name: 'Max_Height_cm', type: 'DECIMAL(5,1)', check: 'Max>=Min>0' },
                        { name: 'Capacity_Per_Slot', type: 'INT' },
                        { name: 'Thrill_Level', type: 'ENUM' }
                    ]
                }
            },
            {
                id: 'Virtual_Queue_Pass',
                position: { x: 650, y: 380 },
                data: {
                    label: 'Virtual_Queue_Pass',
                    badge: 'Associative (1:N)',
                    attributes: [
                        { name: 'Pass_ID', type: 'INT', isPk: true },
                        { name: 'Band_ID', type: 'INT', isFk: true },
                        { name: 'Attraction_ID', type: 'INT', isFk: true },
                        { name: 'Slot_Start_Time', type: 'TIME' },
                        { name: 'Slot_End_Time', type: 'TIME', check: 'End > Start' },
                        { name: 'Status', type: 'ENUM' }
                    ]
                }
            },
            {
                id: 'Locker',
                position: { x: 50, y: 400 },
                data: {
                    label: 'Locker',
                    badge: 'Entity',
                    attributes: [
                        { name: 'Locker_ID', type: 'INT', isPk: true },
                        { name: 'Zone', type: 'VARCHAR(50)', isUq: 'Composite' },
                        { name: 'Number', type: 'VARCHAR(10)', isUq: 'Composite' }
                    ]
                }
            },
            {
                id: 'Locker_Rental',
                position: { x: 250, y: 400 },
                data: {
                    label: 'Locker_Rental',
                    badge: 'Associative',
                    attributes: [
                        { name: 'Rental_ID', type: 'INT', isPk: true },
                        { name: 'Locker_ID', type: 'INT', isFk: true },
                        { name: 'Band_ID', type: 'INT', isFk: true },
                        { name: 'Rental_Start_Time', type: 'DATETIME' },
                        { name: 'Rental_End_Time', type: 'DATETIME' },
                        { name: 'Status', type: 'ENUM' }
                    ]
                }
            },
            {
                id: 'POS_Outlet',
                position: { x: 850, y: 650 },
                data: {
                    label: 'POS_Outlet',
                    badge: 'Entity',
                    attributes: [
                        { name: 'Outlet_ID', type: 'INT', isPk: true },
                        { name: 'Outlet_Name', type: 'VARCHAR(100)' },
                        { name: 'Type', type: 'ENUM' }
                    ]
                }
            },
            {
                id: 'Wallet_Transaction',
                position: { x: 450, y: 650 },
                data: {
                    label: 'Wallet_Transaction',
                    badge: 'Ledger (1:N)',
                    attributes: [
                        { name: 'Transaction_ID', type: 'INT', isPk: true },
                        { name: 'Band_ID', type: 'INT', isFk: true },
                        { name: 'Outlet_ID', type: 'INT', isFk: true },
                        { name: 'Transaction_Type', type: 'ENUM' },
                        { name: 'Amount', type: 'DECIMAL(10,2)', check: '> 0' },
                        { name: 'Closing_Balance', type: 'DECIMAL(10,2)', check: '>= 0' },
                        { name: 'Transaction_Time', type: 'DATETIME' }
                    ]
                }
            }
        ];

        // Edges with cardinalities
        const edges = [
            { id: 'e-visitor-wristband', source: 'Visitor', target: 'RFID_Wristband', label: '1 : 1 (Identity Pass)' },
            { id: 'e-wristband-queue', source: 'RFID_Wristband', target: 'Virtual_Queue_Pass', label: '1 : N (Holds Pass)' },
            { id: 'e-attraction-queue', source: 'Attraction', target: 'Virtual_Queue_Pass', label: '1 : N (Schedules Slot)' },
            { id: 'e-locker-rental', source: 'Locker', target: 'Locker_Rental', label: '1 : N (Rented As)' },
            { id: 'e-wristband-rental', source: 'RFID_Wristband', target: 'Locker_Rental', label: '1 : N (Keyed By)' },
            { id: 'e-wristband-txn', source: 'RFID_Wristband', target: 'Wallet_Transaction', label: '1 : N (Charges Wallet)' },
            { id: 'e-outlet-txn', source: 'POS_Outlet', target: 'Wallet_Transaction', label: '1 : N (Processed At)' }
        ];

        return res.json({ success: true, nodes, edges });

    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

// ==========================================
// 7. GUARDED SQL CONSOLE WITH EXPLAIN
// ==========================================
router.post('/query', async (req, res) => {
    const { query, confirmWrite } = req.body;

    if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: true, message: 'SQL query string required.' });
    }

    const trimmed = query.trim();
    const isSelect = /^SELECT\b/i.test(trimmed) || /^SHOW\b/i.test(trimmed) || /^EXPLAIN\b/i.test(trimmed) || /^DESCRIBE\b/i.test(trimmed);

    // Guard: Mutations require explicit user confirmation flag
    if (!isSelect && !confirmWrite) {
        return res.status(400).json({
            error: true,
            requiresConfirmation: true,
            message: 'GUARDED CONSOLE: This SQL statement will modify data or schema. Please confirm execution to proceed.',
            statement: trimmed
        });
    }

    try {
        const [result, fields] = await trackedQuery(
            adminPool,
            trimmed,
            [],
            'Guarded SQL Console'
        );

        // Run EXPLAIN if it is a SELECT query
        let explainPlan = null;
        if (/^SELECT\b/i.test(trimmed)) {
            try {
                const [exp] = await adminPool.query(`EXPLAIN ${trimmed}`);
                explainPlan = exp;
            } catch (e) {
                // Ignore explain errors
            }
        }

        return res.json({
            success: true,
            isSelect,
            results: Array.isArray(result) ? result : null,
            affectedRows: result.affectedRows,
            insertId: result.insertId,
            fields: fields ? fields.map(f => f.name) : [],
            explainPlan
        });

    } catch (err) {
        return res.status(400).json(formatDatabaseError(err));
    }
});

// ==========================================
// 8. PRE-BUILT ANALYTICAL QUERIES GALLERY
// ==========================================
router.get('/analytical-queries', async (req, res) => {
    const queries = [
        {
            id: 'congested_attractions',
            title: 'Query 1 · Top Congested Attractions by Queue Booking Volume',
            category: 'Queue Management',
            description: 'Identifies attractions experiencing the highest virtual queue demand to balance ride throughput.',
            sql: `SELECT 
    a.Attraction_Name,
    a.Category,
    a.Capacity_Per_Slot,
    COUNT(q.Pass_ID) AS Total_Bookings,
    ROUND((COUNT(q.Pass_ID) / a.Capacity_Per_Slot) * 100, 1) AS Utilization_Pct
FROM Attraction a
LEFT JOIN Virtual_Queue_Pass q ON a.Attraction_ID = q.Attraction_ID AND q.Status = 'Booked'
GROUP BY a.Attraction_ID, a.Attraction_Name, a.Category, a.Capacity_Per_Slot
ORDER BY Total_Bookings DESC
LIMIT 5;`
        },
        {
            id: 'height_eligibility',
            title: 'Query 2 · Height Eligibility Check for All Registered Visitors',
            category: 'Safety Compliance',
            description: 'Evaluates each visitor against ride safety constraints, flagging children and eligible riders.',
            sql: `SELECT 
    v.Full_Name,
    v.Height_cm,
    a.Attraction_Name,
    a.Min_Height_cm,
    CASE 
        WHEN v.Height_cm >= a.Min_Height_cm THEN 'Eligible (Safe)'
        ELSE CONCAT('Denied (Needs +', ROUND(a.Min_Height_cm - v.Height_cm, 1), ' cm)')
    END AS Safety_Verification
FROM Visitor v
CROSS JOIN Attraction a
WHERE a.Category = 'Thrill'
ORDER BY a.Attraction_Name, v.Height_cm DESC;`
        },
        {
            id: 'outlet_revenue',
            title: 'Query 3 · Revenue per POS Outlet (via Vw_Outlet_Revenue)',
            category: 'Finance & Sales',
            description: 'Real-time sales aggregation across retail, souvenirs, and food & beverage counters.',
            sql: `SELECT 
    Outlet_Name,
    Outlet_Type,
    Total_Transactions,
    CONCAT('₹', FORMAT(Total_Revenue_INR, 2)) AS Formatted_Revenue,
    CONCAT('₹', FORMAT(Avg_Transaction_Value_INR, 2)) AS Avg_Transaction
FROM Vw_Outlet_Revenue
ORDER BY Total_Revenue_INR DESC;`
        },
        {
            id: 'occupied_lockers',
            title: 'Query 4 · Currently Occupied Smart Lockers & Renters',
            category: 'Facility Operations',
            description: 'Lists lockers actively occupied by visitors and rental start timestamps.',
            sql: `SELECT 
    l.Zone,
    l.Number AS Locker_Number,
    v.Full_Name AS Renter_Name,
    w.Band_UID,
    r.Rental_Start_Time
FROM Locker_Rental r
JOIN Locker l ON r.Locker_ID = l.Locker_ID
JOIN RFID_Wristband w ON r.Band_ID = w.Band_ID
JOIN Visitor v ON w.Visitor_ID = v.Visitor_ID
WHERE r.Status = 'Active'
ORDER BY l.Zone, l.Number;`
        },
        {
            id: 'safety_compliance',
            title: 'Query 5 · Safety Compliance Report: Minors Below Height for Thrill Rides',
            category: 'Safety Compliance',
            description: 'Immediate alert report listing visitors who fall below the safety threshold for high-speed rides.',
            sql: `SELECT 
    v.Full_Name AS Visitor_Name,
    v.Height_cm,
    a.Attraction_Name,
    a.Min_Height_cm AS Required_Min_Height,
    ROUND(a.Min_Height_cm - v.Height_cm, 1) AS Deficit_cm
FROM Visitor v
CROSS JOIN Attraction a
WHERE a.Category = 'Thrill' AND v.Height_cm < a.Min_Height_cm
ORDER BY Deficit_cm DESC;`
        }
    ];

    // Execute all queries and return with results
    try {
        const enriched = [];
        for (const q of queries) {
            const [rows] = await adminPool.query(q.sql);
            enriched.push({
                ...q,
                results: rows,
                columns: rows.length > 0 ? Object.keys(rows[0]) : []
            });
        }
        return res.json({ success: true, queries: enriched });

    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

// ==========================================
// 9. INDEX LAB: EXPLAIN BENCHMARK
// ==========================================
router.post('/index-lab', async (req, res) => {
    const { queryType } = req.body;

    // Define benchmark queries
    let testQuery = '';
    let description = '';

    if (queryType === 'wallet') {
        testQuery = `SELECT * FROM Wallet_Transaction WHERE Band_ID = 1 ORDER BY Transaction_Time DESC`;
        description = 'Chronological customer wallet ledger lookup (idx_txn_band_time)';
    } else if (queryType === 'height') {
        testQuery = `SELECT * FROM Attraction WHERE Min_Height_cm <= 140 AND Max_Height_cm >= 140`;
        description = 'Attraction safety height threshold range scan (idx_attr_height)';
    } else {
        testQuery = `SELECT * FROM Virtual_Queue_Pass WHERE Band_ID = 1 AND Status = 'Booked'`;
        description = 'Active queue pass lookup per wristband (idx_vq_band_status)';
    }

    try {
        const start = performance.now();
        const [rows] = await adminPool.query(testQuery);
        const duration = (performance.now() - start).toFixed(2);

        // Get EXPLAIN plan
        const [explainRows] = await adminPool.query(`EXPLAIN ${testQuery}`);
        
        // Detailed Index analysis
        const plan = explainRows[0] || {};

        return res.json({
            success: true,
            queryType,
            description,
            sql: testQuery,
            executionTimeMs: parseFloat(duration),
            resultCount: rows.length,
            explain: {
                selectType: plan.select_type,
                table: plan.table,
                type: plan.type, // 'ref', 'range', 'ALL'
                possibleKeys: plan.possible_keys,
                keyUsed: plan.key,
                keyLength: plan.key_len,
                ref: plan.ref,
                rowsScanned: plan.rows,
                filtered: plan.filtered,
                extra: plan.Extra,
                isOptimized: plan.type !== 'ALL'
            }
        });

    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

// ==========================================
// 10. PRIVILEGES & RBAC TAB (SHOW GRANTS)
// ==========================================
router.get('/privileges', async (req, res) => {
    const roles = [
        { role: 'park_admin', user: 'park_admin', host: 'localhost', description: 'Full administrative access on smart_theme_park database' },
        { role: 'park_customer', user: 'park_customer', host: 'localhost', description: 'Least-privilege customer access (safe views + self-service procedures)' },
        { role: 'ride_staff', user: 'ride_staff', host: 'localhost', description: 'Turnstile access and sp_ride_tap_in execution' },
        { role: 'pos_operator', user: 'pos_operator', host: 'localhost', description: 'POS outlet sales and sp_make_purchase execution' }
    ];

    try {
        const privileges = [];
        for (const r of roles) {
            try {
                const [grants] = await adminPool.query(`SHOW GRANTS FOR '${r.user}'@'${r.host}'`);
                const grantList = grants.map(g => Object.values(g)[0]);
                privileges.push({
                    ...r,
                    grants: grantList
                });
            } catch (e) {
                privileges.push({
                    ...r,
                    grants: [`Error reading grants: ${e.message}`]
                });
            }
        }

        return res.json({ success: true, roles: privileges });

    } catch (err) {
        return res.status(500).json(formatDatabaseError(err));
    }
});

module.exports = router;
