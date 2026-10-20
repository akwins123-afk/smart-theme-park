-- ====================================================================
-- MIGRATION 004: Performance & FK Indexes
-- Optimizes query execution plans for virtual queue lookups,
-- turnstile checks, transaction history, and Index Lab benchmarking.
-- ====================================================================

USE smart_theme_park;

-- 1. Virtual Queue Pass: Rapid lookups by Band and Status (used in customer dashboard & overlap trigger)
CREATE INDEX idx_vq_band_status 
ON Virtual_Queue_Pass (Band_ID, Status);

-- 2. Virtual Queue Pass: Attraction schedule lookups (used in live congestion analysis & timeline rendering)
CREATE INDEX idx_vq_attr_time 
ON Virtual_Queue_Pass (Attraction_ID, Slot_Start_Time, Slot_End_Time);

-- 3. Wallet Transactions: Chronological history per wristband (used in customer wallet timeline & balance audits)
CREATE INDEX idx_txn_band_time 
ON Wallet_Transaction (Band_ID, Transaction_Time DESC);

-- 4. POS Outlet Transactions: Revenue aggregation by outlet (used in Vw_Outlet_Revenue)
CREATE INDEX idx_txn_outlet_type 
ON Wallet_Transaction (Outlet_ID, Transaction_Type);

-- 5. Locker Rental: Active locker lookup per wristband
CREATE INDEX idx_rental_band_status 
ON Locker_Rental (Band_ID, Status);

-- 6. Attraction: Height filter index for safety compliance & ride filtering
CREATE INDEX idx_attr_height 
ON Attraction (Min_Height_cm, Max_Height_cm);
