# Smart Theme Park: RFID Wristband & Virtual Queue Management System
**Database Management Systems (BACSE202) — Digital Assignment (Review 3 / Final Milestone)**  
**Authors**: Akash R (25BCE5354) · Vasisht V (25BCE5748) · Sri Balaji V (25BCE5697)  
**Academic Year**: Year 2, Semester 1

---

## 1. Project Overview & Context

In traditional theme parks, visitors juggle fragile paper entry tickets, separate locker keys, cash/cards for food & souvenirs, and wait in long physical lines without real-time insight into wait times. Park operators face disjointed databases, inventory slippage, and safety verification oversights.

**Our Solution**: One waterproof RFID wristband acts as:
1. **Digital Identity**: Linked 1:1 with a demographic visitor profile.
2. **Contactless Prepaid Wallet**: Deducted instantly across POS outlets with non-negative balance enforcement.
3. **Keyless Smart Locker Key**: Single-visitor occupancy enforced by stored procedures.
4. **Ride Access & Virtual Queue (FastPass)**: 30-minute reservation intervals with automated height safety checks and overlapping reservation blocking.

The system is built on **MySQL 8** (normalized to **3NF**), with a **Node.js Express** backend (pure parameterized SQL, no ORM, dual RBAC connection pools) and a **React + Vite + Tailwind CSS + Framer Motion** frontend.

---

## 2. Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (React + Vite)                     │
│   Carnival Neon Visitor Portal  │   Dark Sleek Admin Control Room     │
│   (Framer Motion, Recharts)     │   (React Flow ER, Live SQL Drawer)   │
└───────────────────▲────────────────────────────────────▲───────────────┘
                    │ HTTP / REST                        │ SSE Stream
                    ▼                                    │ (/api/events)
┌────────────────────────────────────────────────────────┴───────────────┐
│                      BACKEND SERVER (Express + Node.js)                │
│    - Dual Connection Pools: park_admin vs park_customer                │
│    - Live SQL Query Instrumentation & Execution Timer                  │
│    - Centralized MySQL Error Code Mapping (1062, 1452, 3819, 45000)   │
└───────────────────▲────────────────────────────────────▲───────────────┘
                    │                                    │
                    ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER (MySQL 8)                        │
│   8 Relational Tables (3NF)  │ 4 Triggers (Overlaps, Wallet, Audit)   │
│   8 Stored Procedures        │ 4 Reporting Views (360, Revenue, Load) │
│   6 B-Tree Indexes           │ 4 RBAC Roles (Admin, Customer, Staff)  │
└────────────────────────────────────────────────────────────────────────┘
```

- **Database**: MySQL 8.0 Community Server.
- **Backend**: Node.js v25 + Express + `mysql2/promise` (pure parameterized SQL).
- **Frontend**: React 18 + Vite + Tailwind CSS + Framer Motion + Recharts + `@xyflow/react` + `canvas-confetti`.
- **Live Sync**: Server-Sent Events (SSE) bus at `/api/events` for real-time wallet & queue updates.

---

## 3. Quick Start & Setup

### Prerequisites
- Node.js (v18+) & npm
- MySQL Server 8.0 running locally on port `3306`

### One-Command Setup
```bash
# 1. Clone or open project root
cd "f:\2nd Year 1st sem"

# 2. Run the automated database setup and dependency installation
npm run setup
```
`npm run setup` will:
1. Connect to MySQL using credentials configured in `server/.env`.
2. Execute `schema.sql` (creating database `smart_theme_park`, 8 base tables, triggers, and views).
3. Execute `seed.sql` (loading the 8 visitors, 8 wristbands, 6 rides, 4 lockers, 4 outlets, 9 transactions).
4. Run all migrations (`001` to `006`).
5. Install client and server packages.

### Launch Application
```bash
# Launch both Backend (port 5000) and Frontend (port 5173) concurrently:
npm run dev
```

Open your browser to: **[http://localhost:5173](http://localhost:5173)**

---

## 4. Default Credentials & Access Portals

### 1. Visitor Portal (Self-Service)
- **Demo RFID Wristbands** (1-click chips available in login modal):
  - `UID-A101`: Aarav Menon (Height: 175 cm, Balance: ₹2,500, All rides eligible)
  - `UID-M202`: Meera Iyer (Height: 162 cm, Balance: ₹700)
  - `UID-K303`: Kabir Nair (Height: 128 cm, Balance: ₹420, Minor / Safety restricted on Thrill rides)
  - `UID-V404`: Vivaan Rao (Height: 110 cm, Balance: ₹320, Child / Restricted)
- **Default PIN**: `1234`

### 2. Park Staff / Admin Portal (Mission Control)
- **Password**: `ThemePark@2026`
- **Security Features**:
  - Verification on server only via `bcrypt.compare`.
  - Stored as bcrypt hash in `server/.env` (`ADMIN_PASSWORD_HASH`).
  - Signed JWT in httpOnly cookie (`admin_token`, 2-hour expiry).
  - Rate-limited: 5 failed attempts trigger a 60-second cooldown timer.
  - UI shake animation on invalid password attempts.

---

## 5. Relational Database Schema (3NF)

### Tables & Primary/Foreign Keys

| Table | Primary Key | Foreign Keys / Unique Constraints | Domain CHECK Constraints |
| :--- | :--- | :--- | :--- |
| **`Visitor`** | `Visitor_ID` | `UNIQUE(Email)` | `CHECK (Height_cm > 0.0)` |
| **`RFID_Wristband`** | `Band_ID` | `UNIQUE(Band_UID)`, `UNIQUE(Visitor_ID)` → `Visitor(Visitor_ID)` ON DELETE CASCADE | `CHECK (Wallet_Balance >= 0.00)` |
| **`Attraction`** | `Attraction_ID` | None | `CHECK (Max_Height_cm >= Min_Height_cm AND Min_Height_cm > 0.0)` |
| **`Virtual_Queue_Pass`** | `Pass_ID` | `Band_ID` → `RFID_Wristband`, `Attraction_ID` → `Attraction` | `CHECK (Slot_End_Time > Slot_Start_Time)` |
| **`Locker`** | `Locker_ID` | `UNIQUE(Zone, Number)` | None |
| **`Locker_Rental`** | `Rental_ID` | `Locker_ID` → `Locker`, `Band_ID` → `RFID_Wristband` | None |
| **`POS_Outlet`** | `Outlet_ID` | None | None |
| **`Wallet_Transaction`**| `Transaction_ID`| `Band_ID` → `RFID_Wristband`, `Outlet_ID` → `POS_Outlet` | `CHECK (Amount > 0.00)`, `CHECK (Closing_Balance >= 0.00)` |
| **`Park_Audit_Log`** | `Log_ID` | `Band_ID` → `RFID_Wristband` | None |

### Normalization Justification
- **1NF**: All column domains are atomic scalars (no repeating groups, no delimited phone/email lists).
- **2NF**: All non-key attributes depend on the entire primary key. In associative entities (`Virtual_Queue_Pass`, `Locker_Rental`), surrogate keys eliminate partial functional dependencies.
- **3NF**: No transitive dependencies ($X \rightarrow Y \rightarrow Z$). Attraction descriptions reside only in `Attraction`; POS names reside only in `POS_Outlet`.

---

## 6. Triggers & Stored Procedures

### Triggers
1. **`trg_no_overlapping_queue_pass`** (`BEFORE INSERT ON Virtual_Queue_Pass`):
   Scans existing `Booked` passes for the same wristband. If the new slot overlaps an existing booking (`NEW.Slot_Start_Time < Slot_End_Time AND NEW.Slot_End_Time > Slot_Start_Time`), execution is aborted via:
   `SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Overlapping virtual queue slot for this wristband'`.
2. **`trg_wallet_transaction_apply`** (`BEFORE INSERT ON Wallet_Transaction`):
   Acquires row-lock (`FOR UPDATE`) on the wristband. Rejects purchases exceeding the live balance with:
   `SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient wallet balance for purchase'`.
   Computes `Closing_Balance` and updates `RFID_Wristband.Wallet_Balance` atomically.
3. **`trg_audit_locker_rental_insert`** / **`update`**:
   Writes immutable operational audit records to `Park_Audit_Log` on locker rental and release events.

### Stored Procedures
- `sp_top_up_wallet(IN p_band_id, IN p_amount, OUT p_new_balance)`
- `sp_make_purchase(IN p_band_id, IN p_outlet_id, IN p_amount, OUT p_new_balance)`
- `sp_book_queue_pass(IN p_band_id, IN p_attraction_id, IN p_start, IN p_end, OUT p_pass_id)`
- `sp_cancel_queue_pass(IN p_pass_id, IN p_band_id)`
- `sp_ride_tap_in(IN p_band_id, IN p_attraction_id, OUT p_status, OUT p_reason)`
- `sp_rent_locker(IN p_band_id, IN p_locker_id, OUT p_rental_id)`
- `sp_release_locker(IN p_rental_id, IN p_band_id)`
- `sp_register_visitor_with_band(IN p_name, IN p_height, IN p_email, IN p_phone, IN p_opening_balance, IN p_pin, OUT p_visitor_id, OUT p_band_uid)`

---

## 7. Role-Based Access Control (RBAC)

The system establishes 4 MySQL user accounts to enforce least-privilege security:

```sql
-- 1. park_admin: Full database management
GRANT ALL PRIVILEGES ON smart_theme_park.* TO 'park_admin'@'localhost';

-- 2. park_customer: Read safe views & execute customer procedures ONLY
GRANT SELECT ON smart_theme_park.Attraction TO 'park_customer'@'localhost';
GRANT SELECT ON smart_theme_park.Vw_My_Pass_Details TO 'park_customer'@'localhost';
GRANT SELECT ON smart_theme_park.Vw_Attraction_Live_Load TO 'park_customer'@'localhost';
GRANT EXECUTE ON PROCEDURE smart_theme_park.sp_book_queue_pass TO 'park_customer'@'localhost';
GRANT EXECUTE ON PROCEDURE smart_theme_park.sp_cancel_queue_pass TO 'park_customer'@'localhost';
GRANT EXECUTE ON PROCEDURE smart_theme_park.sp_rent_locker TO 'park_customer'@'localhost';
GRANT EXECUTE ON PROCEDURE smart_theme_park.sp_release_locker TO 'park_customer'@'localhost';

-- 3. ride_staff: Turnstile execution
GRANT EXECUTE ON PROCEDURE smart_theme_park.sp_ride_tap_in TO 'ride_staff'@'localhost';

-- 4. pos_operator: Retail checkout
GRANT EXECUTE ON PROCEDURE smart_theme_park.sp_make_purchase TO 'pos_operator'@'localhost';
```

---

## 8. Index Lab & Query Optimization

| Query Type | Without Index | With B-Tree Index | Performance Gain |
| :--- | :--- | :--- | :--- |
| **Virtual Queue Lookup** (`Band_ID`, `Status`) | `type: ALL` (Full Table Scan) | `type: ref` (`idx_vq_band_status`) | Scans only matching rows ($O(\log N)$) |
| **Wallet History** (`Band_ID`, `Transaction_Time DESC`) | `Using filesort` | `Backward index scan` (`idx_txn_band_time`) | Eliminates CPU sort buffer overhead |
| **Safety Height Filter** (`Min_Height_cm`, `Max_Height_cm`) | `type: ALL` | `type: range` (`idx_attr_height`) | Direct index range scan |

---

## 9. Review 3 Presentation Script
For the complete 5-minute click-by-click viva demonstration script and 15 in-depth technical viva answers, refer to **`DEMO_SCRIPT.md`**.
