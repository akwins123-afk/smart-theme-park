-- ====================================================================
-- INDEX LAB BENCHMARK QUERIES
-- Demonstrates query optimization, scanned rows reduction, and EXPLAIN plans
-- ====================================================================

USE smart_theme_park;

-- Benchmark Query 1: Find all booked passes for a wristband in a time interval
-- Without index: type=ALL, full table scan
-- With index (idx_vq_band_status / idx_vq_attr_time): type=ref, scanned rows = matching rows
EXPLAIN SELECT * 
FROM Virtual_Queue_Pass 
WHERE Band_ID = 1 AND Status = 'Booked';

-- Benchmark Query 2: Chronological wallet transaction timeline for customer
-- With idx_txn_band_time: backward index scan avoiding temporary file-sort
EXPLAIN SELECT Transaction_ID, Transaction_Type, Amount, Closing_Balance, Transaction_Time
FROM Wallet_Transaction
WHERE Band_ID = 1
ORDER BY Transaction_Time DESC;

-- Benchmark Query 3: Safety height filter for Extreme Thrill attractions
-- With idx_attr_height: index range scan
EXPLAIN SELECT Attraction_ID, Attraction_Name, Min_Height_cm, Max_Height_cm
FROM Attraction
WHERE Min_Height_cm <= 140 AND Max_Height_cm >= 140;
