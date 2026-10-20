-- ====================================================================
-- SMART THEME PARK: SEED SCRIPT (Review 2 Baseline Dataset)
-- Loads 8 visitors, 8 wristbands, 6 attractions, 4 lockers,
-- 4 POS outlets, 9 virtual queue passes, 2 locker rentals, and transactions.
-- ====================================================================

USE smart_theme_park;

-- Temporarily disable FK checks to cleanly reset data if re-seeding
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE Wallet_Transaction;
TRUNCATE TABLE Locker_Rental;
TRUNCATE TABLE Virtual_Queue_Pass;
TRUNCATE TABLE RFID_Wristband;
TRUNCATE TABLE Visitor;
TRUNCATE TABLE Attraction;
TRUNCATE TABLE Locker;
TRUNCATE TABLE POS_Outlet;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. VISITORS (8 Visitors with varying heights and profiles)
INSERT INTO Visitor (Visitor_ID, Full_Name, Height_cm, Email, Phone, Registration_Date) VALUES
(1, 'Aarav Menon', 175.0, 'aarav.menon@example.com', '+91 9876543210', '2026-09-15 09:30:00'),
(2, 'Meera Iyer', 162.0, 'meera.iyer@example.com', '+91 9876543211', '2026-09-15 09:45:00'),
(3, 'Kabir Nair', 128.0, 'kabir.nair@example.com', '+91 9876543212', '2026-09-15 10:00:00'),
(4, 'Vivaan Rao', 110.0, 'vivaan.rao@example.com', '+91 9876543213', '2026-09-15 10:15:00'),
(5, 'Ananya Sharma', 168.0, 'ananya.s@example.com', '+91 9876543214', '2026-09-15 10:30:00'),
(6, 'Rohan Verma', 182.0, 'rohan.v@example.com', '+91 9876543215', '2026-09-15 10:45:00'),
(7, 'Diya Patel', 135.0, 'diya.patel@example.com', '+91 9876543216', '2026-09-15 11:00:00'),
(8, 'Aditya Joshi', 155.0, 'aditya.j@example.com', '+91 9876543217', '2026-09-15 11:15:00');

-- 2. RFID WRISTBANDS (1:1 with Visitors, initial balances, Active)
-- bcrypt hash for default demo PIN '1234': $2a$10$wK1kYFj2G2.1sP2sW2d3ne9kjYVv4l2Hj/k9Qv5p8sH4P9B3QhZKm
INSERT INTO RFID_Wristband (Band_ID, Band_UID, Visitor_ID, Wallet_Balance, Status) VALUES
(1, 'UID-A101', 1, 1250.00, 'Active'),
(2, 'UID-M202', 2, 850.00, 'Active'),
(3, 'UID-K303', 3, 500.00, 'Active'),
(4, 'UID-V404', 4, 400.00, 'Active'),
(5, 'UID-A505', 5, 1500.00, 'Active'),
(6, 'UID-R606', 6, 2100.00, 'Active'),
(7, 'UID-D707', 7, 350.00, 'Active'),
(8, 'UID-A808', 8, 950.00, 'Active');

-- 3. ATTRACTIONS (6 Attractions across Thrill, Water, Family, Theater)
INSERT INTO Attraction (Attraction_ID, Attraction_Name, Category, Min_Height_cm, Max_Height_cm, Capacity_Per_Slot, Thrill_Level) VALUES
(1, 'Dragon Fury Rollercoaster', 'Thrill', 140.0, 210.0, 35, 'Extreme'),
(2, 'Thunder Rapids Water Slide', 'Water', 120.0, 205.0, 25, 'High'),
(3, '4D Galaxy Theater', 'Theater', 90.0, 220.0, 60, 'Low'),
(4, 'Sky Drop Tower', 'Thrill', 150.0, 200.0, 20, 'Extreme'),
(5, 'Pirate Cove River Cruise', 'Family', 80.0, 230.0, 40, 'Low'),
(6, 'Cosmic Spin Coaster', 'Thrill', 130.0, 205.0, 30, 'Moderate');

-- 4. LOCKERS (4 Lockers across zones)
INSERT INTO Locker (Locker_ID, Zone, Number) VALUES
(1, 'Entrance Zone', 'L-101'),
(2, 'Entrance Zone', 'L-102'),
(3, 'Water Zone', 'L-201'),
(4, 'Water Zone', 'L-202');

-- 5. POS OUTLETS (4 Outlets across F&B, Souvenirs, Photo)
INSERT INTO POS_Outlet (Outlet_ID, Outlet_Name, Type) VALUES
(1, 'Park Memories Store', 'Souvenirs'),
(2, 'Photo Point Studio', 'Photo'),
(3, 'Splash Snack Bar', 'F&B'),
(4, 'Thunder Grill', 'F&B');

-- 6. VIRTUAL QUEUE PASSES (9 Passes)
-- Note: Dragon Fury has 4 passes, Thunder Rapids has 2, 4D Galaxy has 1, etc.
-- Aarav Menon (Band 1) holds 13:00-13:30 on Dragon Fury
INSERT INTO Virtual_Queue_Pass (Pass_ID, Band_ID, Attraction_ID, Slot_Start_Time, Slot_End_Time, Status, Created_At) VALUES
(1, 1, 1, '13:00:00', '13:30:00', 'Booked', '2026-09-15 11:30:00'),
(2, 2, 1, '13:00:00', '13:30:00', 'Booked', '2026-09-15 11:35:00'),
(3, 5, 1, '13:30:00', '14:00:00', 'Booked', '2026-09-15 11:40:00'),
(4, 6, 1, '14:00:00', '14:30:00', 'Booked', '2026-09-15 11:45:00'),
(5, 1, 2, '14:30:00', '15:00:00', 'Booked', '2026-09-15 11:50:00'),
(6, 2, 2, '14:30:00', '15:00:00', 'Booked', '2026-09-15 11:55:00'),
(7, 3, 3, '12:00:00', '12:30:00', 'Booked', '2026-09-15 11:20:00'),
(8, 7, 5, '12:30:00', '13:00:00', 'Booked', '2026-09-15 11:25:00'),
(9, 8, 6, '15:00:00', '15:30:00', 'Booked', '2026-09-15 11:58:00');

-- 7. LOCKER RENTALS (2 Active rentals)
-- L-101 rented by Aarav Menon (Band 1)
-- L-201 rented by Meera Iyer (Band 2)
INSERT INTO Locker_Rental (Rental_ID, Locker_ID, Band_ID, Rental_Start_Time, Rental_End_Time, Status) VALUES
(1, 1, 1, '2026-09-15 10:00:00', NULL, 'Active'),
(2, 3, 2, '2026-09-15 10:15:00', NULL, 'Active');

-- 8. WALLET TRANSACTIONS (9 Transactions matching Review 2 presentation)
-- Park Memories Store: 2 txns, ₹330 (₹180 + ₹150)
-- Photo Point Studio: 1 txn, ₹300
-- Splash Snack Bar: 2 txns, ₹180 (₹100 + ₹80)
-- Thunder Grill: 2 txns, ₹170 (₹90 + ₹80)
-- Plus top-ups
-- We temporarily bypass the trigger by inserting directly so historical Closing_Balance matches.
SET @DISABLE_TRIGGERS = 1;
INSERT INTO Wallet_Transaction (Transaction_ID, Band_ID, Outlet_ID, Transaction_Type, Amount, Closing_Balance, Transaction_Time) VALUES
(1, 1, NULL, 'Top-up', 2000.00, 2000.00, '2026-09-15 09:35:00'),
(2, 1, 1, 'Purchase', 180.00, 1820.00, '2026-09-15 11:00:00'),
(3, 2, 1, 'Purchase', 150.00, 850.00, '2026-09-15 11:15:00'),
(4, 5, 2, 'Purchase', 300.00, 1500.00, '2026-09-15 11:30:00'),
(5, 1, 3, 'Purchase', 100.00, 1720.00, '2026-09-15 11:45:00'),
(6, 3, 3, 'Purchase', 80.00, 500.00, '2026-09-15 12:00:00'),
(7, 1, 4, 'Purchase', 90.00, 1630.00, '2026-09-15 12:15:00'),
(8, 4, 4, 'Purchase', 80.00, 400.00, '2026-09-15 12:30:00'),
(9, 1, 1, 'Purchase', 380.00, 1250.00, '2026-09-15 12:45:00');
