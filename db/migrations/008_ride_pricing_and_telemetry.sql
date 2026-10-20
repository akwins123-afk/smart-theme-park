-- ====================================================================
-- MIGRATION 008: Ride Pricing, Wallet Debit on Booking, and Live Telemetry
-- Digital Assignment Review 3 Final: Ride pricing & Customer Monitoring
-- ====================================================================

USE smart_theme_park;

-- 1. ADD COLUMN Ride_Price TO Attraction (Additive change)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns 
                   WHERE table_schema = 'smart_theme_park' 
                     AND table_name = 'Attraction' 
                     AND column_name = 'Ride_Price');

SET @sql_cmd = IF(@col_exists = 0, 
    'ALTER TABLE Attraction ADD COLUMN Ride_Price DECIMAL(10,2) NOT NULL DEFAULT 150.00 CHECK (Ride_Price >= 0.00)', 
    'SELECT "Column Ride_Price already exists"');
PREPARE stmt FROM @sql_cmd;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. ADD COLUMNS Attraction_ID AND Notes TO Wallet_Transaction (Additive change)
SET @col_exists_attr = (SELECT COUNT(*) FROM information_schema.columns 
                        WHERE table_schema = 'smart_theme_park' 
                          AND table_name = 'Wallet_Transaction' 
                          AND column_name = 'Attraction_ID');

SET @sql_cmd_attr = IF(@col_exists_attr = 0, 
    'ALTER TABLE Wallet_Transaction ADD COLUMN Attraction_ID INT NULL, ADD CONSTRAINT fk_wallet_txn_attraction FOREIGN KEY (Attraction_ID) REFERENCES Attraction(Attraction_ID) ON DELETE SET NULL', 
    'SELECT "Column Attraction_ID already exists"');
PREPARE stmt_attr FROM @sql_cmd_attr;
EXECUTE stmt_attr;
DEALLOCATE PREPARE stmt_attr;

SET @col_exists_notes = (SELECT COUNT(*) FROM information_schema.columns 
                         WHERE table_schema = 'smart_theme_park' 
                           AND table_name = 'Wallet_Transaction' 
                           AND column_name = 'Notes');

SET @sql_cmd_notes = IF(@col_exists_notes = 0, 
    'ALTER TABLE Wallet_Transaction ADD COLUMN Notes VARCHAR(255) NULL', 
    'SELECT "Column Notes already exists"');
PREPARE stmt_notes FROM @sql_cmd_notes;
EXECUTE stmt_notes;
DEALLOCATE PREPARE stmt_notes;

-- 3. SET REALISTIC PRICING FOR ALL 18 ATTRACTIONS (INR)
UPDATE Attraction SET Ride_Price = 180.00 WHERE Attraction_ID = 1; -- Dragon Fury Rollercoaster
UPDATE Attraction SET Ride_Price = 150.00 WHERE Attraction_ID = 2; -- Thunder Rapids Water Slide
UPDATE Attraction SET Ride_Price = 120.00 WHERE Attraction_ID = 3; -- 4D Galaxy Theater
UPDATE Attraction SET Ride_Price = 160.00 WHERE Attraction_ID = 4; -- Sky Drop Tower
UPDATE Attraction SET Ride_Price = 100.00 WHERE Attraction_ID = 5; -- Pirate Cove River Cruise
UPDATE Attraction SET Ride_Price = 150.00 WHERE Attraction_ID = 6; -- Cosmic Spin Coaster
UPDATE Attraction SET Ride_Price = 250.00 WHERE Attraction_ID = 7; -- Space Mountain
UPDATE Attraction SET Ride_Price = 300.00 WHERE Attraction_ID = 8; -- Avatar Flight of Passage
UPDATE Attraction SET Ride_Price = 350.00 WHERE Attraction_ID = 9; -- Star Wars: Rise of the Resistance
UPDATE Attraction SET Ride_Price = 200.00 WHERE Attraction_ID = 10; -- Big Thunder Mountain Railroad
UPDATE Attraction SET Ride_Price = 300.00 WHERE Attraction_ID = 11; -- TRON Lightcycle / Run
UPDATE Attraction SET Ride_Price = 220.00 WHERE Attraction_ID = 12; -- Expedition Everest
UPDATE Attraction SET Ride_Price = 100.00 WHERE Attraction_ID = 13; -- Peter Pan's Flight
UPDATE Attraction SET Ride_Price = 220.00 WHERE Attraction_ID = 14; -- Twilight Zone Tower of Terror
UPDATE Attraction SET Ride_Price = 180.00 WHERE Attraction_ID = 15; -- Recoil Rollercoaster
UPDATE Attraction SET Ride_Price = 150.00 WHERE Attraction_ID = 16; -- Wonderla Flash Tower
UPDATE Attraction SET Ride_Price = 140.00 WHERE Attraction_ID = 17; -- Wonder Splash Chute
UPDATE Attraction SET Ride_Price = 120.00 WHERE Attraction_ID = 18; -- Jungle Safari 4D Adventure

-- 4. UPDATE VIEW Vw_Attraction_Live_Load TO INCLUDE Ride_Price
CREATE OR REPLACE VIEW Vw_Attraction_Live_Load AS
SELECT 
    a.Attraction_ID,
    a.Attraction_Name,
    a.Category,
    a.Min_Height_cm,
    a.Max_Height_cm,
    a.Capacity_Per_Slot,
    COALESCE(a.Thrill_Level, 'Moderate') AS Thrill_Level,
    COALESCE(a.Ride_Price, 150.00) AS Ride_Price,
    COALESCE(a.Image_URL, 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?auto=format&fit=crop&w=800&q=80') AS Image_URL,
    COALESCE(a.Park_Land, 'Theme Park Realm') AS Park_Land,
    COUNT(CASE WHEN q.Status = 'Booked' THEN q.Pass_ID END) AS Active_Booked_Passes,
    CASE 
        WHEN COUNT(CASE WHEN q.Status = 'Booked' THEN q.Pass_ID END) >= a.Capacity_Per_Slot THEN 'Full'
        WHEN COUNT(CASE WHEN q.Status = 'Booked' THEN q.Pass_ID END) >= (a.Capacity_Per_Slot * 0.7) THEN 'Heavy'
        WHEN COUNT(CASE WHEN q.Status = 'Booked' THEN q.Pass_ID END) >= (a.Capacity_Per_Slot * 0.3) THEN 'Moderate'
        ELSE 'Low'
    END AS Congestion_Status,
    CASE 
        WHEN COUNT(CASE WHEN q.Status = 'Booked' THEN q.Pass_ID END) >= a.Capacity_Per_Slot THEN 60
        WHEN COUNT(CASE WHEN q.Status = 'Booked' THEN q.Pass_ID END) >= (a.Capacity_Per_Slot * 0.7) THEN 45
        WHEN COUNT(CASE WHEN q.Status = 'Booked' THEN q.Pass_ID END) >= (a.Capacity_Per_Slot * 0.3) THEN 25
        ELSE 10
    END AS Estimated_Wait_Min
FROM Attraction a
LEFT JOIN Virtual_Queue_Pass q ON a.Attraction_ID = q.Attraction_ID
GROUP BY a.Attraction_ID, a.Attraction_Name, a.Category, a.Min_Height_cm, a.Max_Height_cm, a.Capacity_Per_Slot, a.Thrill_Level, a.Ride_Price, a.Image_URL, a.Park_Land;

-- 5. UPDATE VIEW Vw_My_Pass_Details TO INCLUDE Ride_Price
CREATE OR REPLACE VIEW Vw_My_Pass_Details AS
SELECT 
    q.Pass_ID,
    q.Band_ID,
    q.Attraction_ID,
    a.Attraction_Name,
    a.Category AS Attraction_Category,
    a.Thrill_Level,
    a.Min_Height_cm,
    a.Max_Height_cm,
    COALESCE(a.Ride_Price, 150.00) AS Ride_Price,
    COALESCE(a.Image_URL, 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?auto=format&fit=crop&w=800&q=80') AS Image_URL,
    COALESCE(a.Park_Land, 'Theme Park Realm') AS Park_Land,
    q.Slot_Start_Time,
    q.Slot_End_Time,
    q.Status,
    q.Created_At
FROM Virtual_Queue_Pass q
JOIN Attraction a ON q.Attraction_ID = a.Attraction_ID;

-- 6. UPDATE PROCEDURE: sp_book_queue_pass (DEBITS RIDE PRICE FROM WALLET)
DROP PROCEDURE IF EXISTS sp_book_queue_pass;
DELIMITER $$
CREATE PROCEDURE sp_book_queue_pass(
    IN p_band_id INT,
    IN p_attraction_id INT,
    IN p_start_time TIME,
    IN p_end_time TIME,
    OUT p_pass_id INT
)
BEGIN
    DECLARE v_height DECIMAL(5,1);
    DECLARE v_min_h DECIMAL(5,1);
    DECLARE v_max_h DECIMAL(5,1);
    DECLARE v_attr_name VARCHAR(100);
    DECLARE v_price DECIMAL(10,2);
    DECLARE v_curr_balance DECIMAL(10,2);
    DECLARE v_status ENUM('Active', 'Inactive', 'Lost');
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Check wristband status & live balance
    SELECT Status, Wallet_Balance INTO v_status, v_curr_balance
    FROM RFID_Wristband
    WHERE Band_ID = p_band_id
    FOR UPDATE;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Wristband not found';
    ELSEIF v_status != 'Active' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Wristband is Inactive or Lost. Cannot book queue passes.';
    END IF;

    -- Check height requirement & price
    SELECT v.Height_cm INTO v_height
    FROM Visitor v
    JOIN RFID_Wristband w ON v.Visitor_ID = w.Visitor_ID
    WHERE w.Band_ID = p_band_id;

    SELECT Attraction_Name, Min_Height_cm, Max_Height_cm, COALESCE(Ride_Price, 150.00) 
    INTO v_attr_name, v_min_h, v_max_h, v_price
    FROM Attraction
    WHERE Attraction_ID = p_attraction_id;

    IF v_attr_name IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Attraction not found';
    END IF;

    IF v_height < v_min_h THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Safety check failed: Visitor height is below minimum requirement';
    ELSEIF v_height > v_max_h THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Safety check failed: Visitor height exceeds maximum threshold';
    END IF;

    -- DEBIT RIDE PRICE FROM WALLET (Enforcing zero overdraw trigger trg_wallet_transaction_apply)
    IF v_price > 0.00 THEN
        IF v_curr_balance < v_price THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Insufficient wallet balance to book ride pass. Please top-up at front desk.';
        END IF;

        -- Insert into Wallet_Transaction triggers trg_wallet_transaction_apply
        INSERT INTO Wallet_Transaction (Band_ID, Outlet_ID, Transaction_Type, Amount, Closing_Balance, Transaction_Time, Attraction_ID, Notes)
        VALUES (p_band_id, NULL, 'Purchase', v_price, 0.00, NOW(), p_attraction_id, CONCAT('FastPass Ticket: ', v_attr_name));
    END IF;

    -- Insert pass (trg_no_overlapping_queue_pass enforces no overlap)
    INSERT INTO Virtual_Queue_Pass (Band_ID, Attraction_ID, Slot_Start_Time, Slot_End_Time, Status, Created_At)
    VALUES (p_band_id, p_attraction_id, p_start_time, p_end_time, 'Booked', NOW());

    SET p_pass_id = LAST_INSERT_ID();

    -- Audit log
    INSERT INTO Park_Audit_Log (Event_Type, Band_ID, Reference_ID, Description, Logged_At)
    VALUES ('Pass_Booking', p_band_id, p_pass_id, 
            CONCAT('Virtual queue pass #', p_pass_id, ' booked for ', v_attr_name, ' (Slot: ', p_start_time, '-', p_end_time, '). Fee debited: ₹', v_price), NOW());

    COMMIT;
END$$
DELIMITER ;

-- 7. UPDATE PROCEDURE: sp_cancel_queue_pass (REFUNDS RIDE PRICE ON CANCEL)
DROP PROCEDURE IF EXISTS sp_cancel_queue_pass;
DELIMITER $$
CREATE PROCEDURE sp_cancel_queue_pass(
    IN p_pass_id INT,
    IN p_band_id INT
)
BEGIN
    DECLARE v_status ENUM('Booked', 'Used', 'Cancelled', 'Expired');
    DECLARE v_attr_id INT;
    DECLARE v_attr_name VARCHAR(100);
    DECLARE v_price DECIMAL(10,2);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT q.Status, q.Attraction_ID, a.Attraction_Name, COALESCE(a.Ride_Price, 150.00)
    INTO v_status, v_attr_id, v_attr_name, v_price
    FROM Virtual_Queue_Pass q
    JOIN Attraction a ON q.Attraction_ID = a.Attraction_ID
    WHERE q.Pass_ID = p_pass_id AND q.Band_ID = p_band_id
    FOR UPDATE;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Pass not found or does not belong to this wristband';
    ELSEIF v_status != 'Booked' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Can only cancel passes with Booked status';
    END IF;

    UPDATE Virtual_Queue_Pass
    SET Status = 'Cancelled'
    WHERE Pass_ID = p_pass_id;

    -- Refund ride fee back to wristband wallet
    IF v_price > 0.00 THEN
        INSERT INTO Wallet_Transaction (Band_ID, Outlet_ID, Transaction_Type, Amount, Closing_Balance, Transaction_Time, Attraction_ID, Notes)
        VALUES (p_band_id, NULL, 'Refund', v_price, 0.00, NOW(), v_attr_id, CONCAT('Refund for cancelled pass: ', v_attr_name));
    END IF;

    INSERT INTO Park_Audit_Log (Event_Type, Band_ID, Reference_ID, Description, Logged_At)
    VALUES ('Pass_Cancelled', p_band_id, p_pass_id, 
            CONCAT('Pass #', p_pass_id, ' cancelled. Refunded ₹', v_price, ' to wristband'), NOW());

    COMMIT;
END$$
DELIMITER ;

-- 8. GRANT PRIVILEGES TO park_customer FOR EXPANDED COLUMNS
GRANT SELECT, INSERT ON smart_theme_park.Wallet_Transaction TO 'park_customer'@'%';
GRANT SELECT, INSERT ON smart_theme_park.Virtual_Queue_Pass TO 'park_customer'@'%';
GRANT SELECT ON smart_theme_park.Attraction TO 'park_customer'@'%';
GRANT EXECUTE ON PROCEDURE smart_theme_park.sp_book_queue_pass TO 'park_customer'@'%';
GRANT EXECUTE ON PROCEDURE smart_theme_park.sp_cancel_queue_pass TO 'park_customer'@'%';
FLUSH PRIVILEGES;
