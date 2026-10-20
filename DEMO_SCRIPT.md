# Smart Theme Park: 5-Minute Viva Demo Script & 15 Technical Q&As
**DBMS Digital Assignment — Review 3 / Final Milestone**  
**Student Presenters**: Akash R (25BCE5354) · Vasisht V (25BCE5748) · Sri Balaji V (25BCE5697)

---

# PART 1: 5-Minute Click-by-Click Viva Demonstration Flow

| Time | Section | Action on Screen | DBMS Concept Proven |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:45** | **Landing & Architecture** | Open Landing page. Move mouse to demonstrate parallax rollercoaster skyline and live metric counters. Point out the two distinct portals. | Relational database as the single source of truth; live operational statistics. |
| **0:45 - 1:45** | **Visitor Portal & Overlap Trigger** | Click **"I'm a Visitor"**, tap demo chip **Aarav Menon (UID-A101)**, enter PIN `1234`. Go to **Rides & FastPass**, attempt to book **Dragon Fury (13:15 - 13:45)**. | **Trigger `trg_no_overlapping_queue_pass`** fires `SIGNAL SQLSTATE '45000'`. Modal pops up with "Which rule blocked this?". |
| **1:45 - 2:45** | **Real-Time Wallet Sync & Overdraw** | Keep Customer Portal open in one window. In a second window, log into **Admin** (`ThemePark@2026`). Go to **Wallet Management**, top-up Aarav's wristband with **₹500**. Watch customer balance update **instantly with coin splash (SSE)**. Print thermal receipt. Next, open **POS Simulator**, charge Kabir Nair (balance ₹420) **₹1,000**. | **Trigger `trg_wallet_transaction_apply`** updates balance atomically, broadcasts SSE event, and blocks overdraws with `SIGNAL SQLSTATE '45000'`. |
| **2:45 - 3:30** | **Turnstile Tap Simulation & Safety Limits** | In Admin **Turnstile Simulator**, select **Dragon Fury (Min 140 cm)** and tap **Kabir Nair (128 cm)**. Gate flashes **RED: DENIED**. Next, tap **Aarav Menon (175 cm)**. Gate flashes **GREEN: GRANTED** and consumes his active pass. | **Stored Procedure `sp_ride_tap_in`** enforcing physical safety bounds and virtual queue consumption. |
| **3:30 - 4:15** | **Database Transparency Center** | Switch to **Option 1 (Transparency Center)**. Show **React Flow ER Diagram** with 1:1 and 1:N cardinality badges. Click `Visitor` to open live data grid. Show PK, FK, and CHECK badges. Open **Schema Viewer** to show 3NF normalization report. | Full transparency of 3NF schema, candidate keys, foreign key references, and constraints. |
| **4:15 - 5:00** | **Index Lab & RBAC Privileges** | Open **Index Lab**, run EXPLAIN on the Virtual Queue query. Point out `type: ref` and rows scanned vs full table scan (`ALL`). Switch to **Privileges Tab** to display `SHOW GRANTS` for `park_customer` vs `park_admin`. Open **Live SQL Inspector Drawer** to show every executed query with its execution time. | Index performance optimization, B-Tree lookups, and least-privilege security. |

---

# PART 2: Step-by-Step Viva Execution Guide

### Demo Step 1: Prove Overlapping Virtual Queue Slot is Blocked
1. On the landing page, click **"I'm a Visitor"**.
2. Click the quick-tap chip for **Aarav Menon (UID-A101)**, PIN `1234`.
3. Click the **"Rides & FastPass"** tab. Note that Aarav already holds a pass for **13:00 - 13:30**.
4. Click **"Select Virtual Queue Slot"** on **Thunder Rapids Water Slide**.
5. Select the slot **01:15 PM - 01:45 PM (Overlap test)**.
6. **Expected Outcome**:
   A vibrant red diagnostic modal appears:
   - **Title**: `Database Business Rule Enforced`
   - **Enforced By**: `BEFORE INSERT Trigger: trg_no_overlapping_queue_pass on Virtual_Queue_Pass`
   - **SQLSTATE Code**: `45000 (Errno 1644)`
   - **Explanation**: *"A visitor cannot hold more than one active virtual queue reservation for overlapping time intervals."*

### Demo Step 2: Prove Instant Live Wallet Top-up via SSE & Thermal Receipt
1. Open Admin Portal by clicking **"Park Staff / Admin"** in the top navbar.
2. Enter password `ThemePark@2026`.
3. In **Option 2 (Park Operations & Finance)**, select **"Wallet Management & Top-up"**.
4. Choose **Aarav Menon (UID-A101)** and click quick-chip **+₹500**.
5. Click **"Apply Top-up & Issue Thermal Receipt"**.
6. **Expected Outcome**:
   - The customer screen's balance instantly jumps from ₹2,500.00 to ₹3,000.00 with an animated coin burst!
   - On the admin screen, a formatted thermal receipt displays with cashier authorization and transaction ID.

### Demo Step 3: Prove Overdraw is Blocked at the POS Counter
1. In Admin Operations, switch to **"POS Tap Simulator"**.
2. Select **Park Memories Store (Souvenirs)**.
3. Select visitor **Kabir Nair (UID-K303)** whose balance is **₹420.00**.
4. Set charge amount to **₹1,000.00** and click **"Tap Wristband & Process Purchase"**.
5. **Expected Outcome**:
   - Operation is rejected with status `REJECTED`.
   - The diagnostic modal explains that `trg_wallet_transaction_apply` blocked the transaction because contactless wallets cannot hold negative balances.

### Demo Step 4: Prove Safety Height Rule at the Turnstile
1. In Admin Operations, select **"Turnstile Ride Tap Simulator"**.
2. Select **Dragon Fury Rollercoaster (Min 140 cm)**.
3. Select **Kabir Nair (128 cm)**. Click **"Tap Turnstile Gate"**.
4. **Expected Outcome**:
   - Gate flashes red: **TURNSTILE GATE: DENIED**
   - Reason: `Height check failed: 128.0 cm < minimum required 140.0 cm`.
5. Now change visitor to **Aarav Menon (175 cm)** and tap again.
6. **Expected Outcome**:
   - Gate flashes green: **TURNSTILE GATE: GRANTED**
   - Reason: `Virtual Queue FastPass #1 verified! Welcome aboard, Aarav Menon!`.

### Demo Step 5: Prove Indexing Optimization in Index Lab
1. In the Admin Portal, switch to **Option 1 (Database Transparency Center)**.
2. Click the **"Index Lab & Benchmarks"** subtab.
3. Click **"Benchmark: Virtual Queue Filter (idx_vq_band_status)"**.
4. **Expected Outcome**:
   - Shows execution time (`< 1 ms`).
   - Visual EXPLAIN shows `JOIN TYPE: ref`, `INDEX UTILIZED: idx_vq_band_status`, and `ROWS SCANNED: 1`.
   - Contrast this with the theoretical full table scan (`type: ALL`).

---

# PART 3: 15 High-Scoring Viva Questions & Technical Answers

### Q1. Why is your relational schema normalized to 3NF, and what anomalies does it prevent?
> **Answer**:  
> Our schema satisfies 1NF, 2NF, and 3NF:
> - **1NF**: All column domains are atomic scalars; no repeating groups exist.
> - **2NF**: In associative tables like `Virtual_Queue_Pass` and `Locker_Rental`, we use surrogate primary keys (`Pass_ID`, `Rental_ID`) so every non-key attribute depends entirely on the primary key, eliminating partial functional dependencies.
> - **3NF**: There are no transitive dependencies ($X \rightarrow Y \rightarrow Z$). For example, attraction details (`Attraction_Name`, `Min_Height_cm`, `Capacity`) live exclusively in `Attraction`. `Virtual_Queue_Pass` only references `Attraction_ID`. If an attraction's name or capacity changes, we update only one row in `Attraction`, eliminating update anomalies, insertion anomalies (we can register rides before passes are booked), and deletion anomalies (deleting a pass doesn't delete the ride).

---

### Q2. What is the difference between a table CHECK constraint and a database TRIGGER? Why couldn't a CHECK constraint prevent overlapping virtual queue passes?
> **Answer**:  
> In MySQL 8, a `CHECK` constraint evaluates expressions involving **only columns of the single row being inserted or updated** (e.g., `CHECK (Max_Height_cm >= Min_Height_cm)` or `CHECK (Wallet_Balance >= 0)`). A `CHECK` constraint cannot execute subqueries or inspect other rows across the table.  
> Preventing overlapping virtual queue slots requires querying other existing rows for the same `Band_ID` whose time intervals intersect (`NEW.Slot_Start_Time < Slot_End_Time AND NEW.Slot_End_Time > Slot_Start_Time`). This cross-row verification requires a `BEFORE INSERT` trigger (`trg_no_overlapping_queue_pass`) that signals `SQLSTATE '45000'` to abort the transaction.

---

### Q3. Why enforce business rules in database triggers and stored procedures instead of purely in the Node.js application layer?
> **Answer**:  
> Enforcing rules at the database level guarantees **centralized data integrity** regardless of which client connects. If another service, POS terminal, data migration script, or DBA connects directly via MySQL Workbench, the database guarantees that an overdrawn wallet, height violation, or overlapping reservation is physically impossible. Enforcing it solely in application code leaves the database vulnerable to bypass, race conditions, and divergent business logic across multiple microservices.

---

### Q4. How do you handle concurrency and race conditions when multiple POS counters charge the same wristband simultaneously?
> **Answer**:  
> In our trigger `trg_wallet_transaction_apply` and stored procedure `sp_make_purchase`, we execute:  
> ```sql
> SELECT Wallet_Balance FROM RFID_Wristband WHERE Band_ID = NEW.Band_ID FOR UPDATE;
> ```  
> The `FOR UPDATE` clause acquires an **exclusive row-level lock** on the wristband in the InnoDB storage engine. If two simultaneous purchase transactions arrive, the second transaction is forced to wait until the first commits. This prevents the classic "lost update" concurrency anomaly and guarantees strict serializability.

---

### Q5. Explain how the 1:1 relationship between `Visitor` and `RFID_Wristband` is physically enforced in MySQL.
> **Answer**:  
> A 1:1 relationship requires that every wristband references exactly one visitor, and no visitor can possess more than one wristband. We enforce this by defining:
> ```sql
> Visitor_ID INT NOT NULL UNIQUE,
> CONSTRAINT fk_wristband_visitor FOREIGN KEY (Visitor_ID) REFERENCES Visitor(Visitor_ID) ON DELETE CASCADE
> ```
> The `FOREIGN KEY` ensures referential integrity to `Visitor`, while the `UNIQUE` constraint guarantees that no two rows in `RFID_Wristband` can share the same `Visitor_ID`.

---

### Q6. How does the B-Tree index on `Virtual_Queue_Pass(Band_ID, Status)` improve query performance in the Index Lab?
> **Answer**:  
> Without an index, MySQL must execute a full table scan (`type: ALL`), reading every data page from disk into the InnoDB buffer pool in $O(N)$ time.  
> Our composite index `idx_vq_band_status` organizes entries in a balanced B+ Tree sorted first by `Band_ID` and then by `Status`. MySQL traverses the tree in $O(\log N)$ time, performing an index reference lookup (`type: ref`) that directly inspects only the matching leaf nodes, reducing disk I/O and query latency to sub-millisecond speeds.

---

### Q7. What is the role of `DECLARE EXIT HANDLER FOR SQLEXCEPTION` in your stored procedures?
> **Answer**:  
> `DECLARE EXIT HANDLER FOR SQLEXCEPTION` provides production-grade exception handling in MySQL:
> ```sql
> DECLARE EXIT HANDLER FOR SQLEXCEPTION
> BEGIN
>     ROLLBACK;
>     RESIGNAL;
> END;
> ```
> If any statement inside the procedure fails (e.g. unique constraint violation, trigger signal, or check constraint error), the handler intercepts the exception, rolls back any partial changes to preserve ACID consistency, and re-signals the original error message to the backend client.

---

### Q8. How does your backend implement Role-Based Access Control (RBAC) at the database layer?
> **Answer**:  
> Rather than using a single god-mode `root` user for every request, our backend initializes two distinct connection pools:
> 1. **`park_customer` Pool**: Used for all `/api/me/*` visitor routes. This user has privileges only to `SELECT` on safe customer views (`Vw_My_Pass_Details`, `Vw_Attraction_Live_Load`) and `EXECUTE` on customer procedures (`sp_book_queue_pass`, `sp_rent_locker`). Direct access to base tables like `Visitor` or financial queries is rejected with `Access denied`.
> 2. **`park_admin` Pool**: Used for staff `/api/admin/*` routes to manage tables and execute operational procedures.

---

### Q9. Explain how the composite UNIQUE constraint on Locker (`Zone`, `Number`) functions.
> **Answer**:  
> In a theme park, locker numbers repeat across distinct physical zones (e.g. Locker `101` in Entrance Zone and Locker `101` in Water Zone). We enforce uniqueness across the composite tuple:
> ```sql
> CONSTRAINT uq_locker_zone_num UNIQUE (Zone, Number)
> ```
> MySQL creates a composite B-Tree index on `(Zone, Number)`. It permits identical numbers in different zones, but rejects an insertion if both `Zone` and `Number` match an existing row (MySQL error 1062).

---

### Q10. What does the `ON DELETE CASCADE` rule do on `RFID_Wristband.Visitor_ID` versus `ON DELETE SET NULL` on `Wallet_Transaction.Outlet_ID`?
> **Answer**:  
> - **`ON DELETE CASCADE`**: A wristband cannot exist without its visitor profile. If a visitor's registration is permanently removed, their associated wristband is automatically removed to prevent orphaned records.
> - **`ON DELETE SET NULL`**: If a physical retail outlet or snack counter is decommissioned and deleted from `POS_Outlet`, historical financial audit logs in `Wallet_Transaction` must **never** be deleted. `ON DELETE SET NULL` preserves the financial transaction row while setting `Outlet_ID = NULL`, maintaining accounting ledger integrity.

---

### Q11. Why did you use Server-Sent Events (SSE) instead of WebSockets for live balance updates?
> **Answer**:  
> Our real-time requirement is **unidirectional push**: when an admin or POS counter updates a wristband's balance or pass status, the server pushes the update down to the visitor's phone.  
> SSE operates over standard HTTP/1.1 or HTTP/2, supports built-in reconnection protocols, works seamlessly through firewalls and corporate proxies without custom handshake upgrades, and has lower memory overhead than bidirectional full-duplex WebSockets.

---

### Q12. In the Index Lab EXPLAIN plan, what do `type`, `key`, `rows`, and `filtered` indicate?
> **Answer**:  
> In MySQL `EXPLAIN`:
> - **`type`**: The join type / scan method. `ALL` indicates a full table scan; `ref` indicates an index lookup matching a specific key value; `range` indicates an index scan over a range of values.
> - **`key`**: The actual index chosen by the MySQL query optimizer.
> - **`rows`**: The optimizer's estimate of how many rows it must examine to execute the query.
> - **`filtered`**: The estimated percentage of examined rows that will satisfy the remaining table conditions ($100\%$ indicates optimal filtering).

---

### Q13. How does the database prevent two visitors from renting the exact same locker at the same time?
> **Answer**:  
> In stored procedure `sp_rent_locker`, we query:
> ```sql
> SELECT COUNT(*) INTO v_active_rental_on_locker
> FROM Locker_Rental
> WHERE Locker_ID = p_locker_id AND Status = 'Active';
> ```
> If `v_active_rental_on_locker > 0`, the procedure triggers `SIGNAL SQLSTATE '45000'` with the message *"Selected locker is currently occupied by another visitor"*. Furthermore, our `trg_audit_locker_rental_insert` trigger logs every locker checkout event to `Park_Audit_Log`.

---

### Q14. What is the purpose of database VIEWs `Vw_Visitor_360` and `Vw_Outlet_Revenue`?
> **Answer**:  
> - **`Vw_Visitor_360`**: Provides a consolidated operational representation combining demographics from `Visitor`, live balance from `RFID_Wristband`, active queue passes from `Virtual_Queue_Pass`, active locker rentals, and total spending from `Wallet_Transaction` using `LEFT JOIN` and aggregation.
> - **`Vw_Outlet_Revenue`**: Pre-aggregates transaction volume, total revenue in INR, and average transaction value per POS outlet from `Wallet_Transaction`. This abstracts complex SQL joins from the application layer and accelerates reporting queries.

---

### Q15. If the theme park grows to 100,000 visitors per day, how would you scale this database architecture?
> **Answer**:  
> 1. **Horizontal Partitioning**: Partition `Wallet_Transaction` and `Park_Audit_Log` by `RANGE (YEAR(Transaction_Time))` or `HASH(Band_ID)` to prune disk partition scans.
> 2. **Read Replicas**: Route read-heavy analytical dashboards and customer schedule lookups to MySQL read replicas, reserving the primary master node exclusively for high-speed writes and stored procedures.
> 3. **Redis Caching**: Cache static attraction metadata (`Attraction`) and zone information in an in-memory cache with cache invalidation on write.
> 4. **Connection Pooling**: Deploy ProxySQL in front of MySQL to multiplex connection pools and cache frequent queries.
