-- ====================================================================
-- MIGRATION 005: Stored Procedures with Error Handling & Transactions
-- Production-grade business procedures enforcing ACID safety & logging
-- ====================================================================

USE smart_theme_park;

-- 1. PROCEDURE: sp_top_up_wallet
DROP PROCEDURE IF EXISTS sp_top_up_wallet;
DELIMITER $$
CREATE PROCEDURE sp_top_up_wallet(
    IN p_band_id INT,
    IN p_amount DECIMAL(10,2),
    OUT p_new_balance DECIMAL(10,2)
)
BEGIN
    DECLARE v_status ENUM('Active', 'Inactive', 'Lost');
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_amount <= 0.00 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Top-up amount must be strictly greater than zero';
    END IF;

    START TRANSACTION;

    SELECT Status INTO v_status
    FROM RFID_Wristband
    WHERE Band_ID = p_band_id
    FOR UPDATE;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Wristband not found';
    ELSEIF v_status != 'Active' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot top-up an Inactive or Lost wristband';
    END IF;

    -- Inserting into Wallet_Transaction triggers trg_wallet_transaction_apply
    INSERT INTO Wallet_Transaction (Band_ID, Outlet_ID, Transaction_Type, Amount, Closing_Balance, Transaction_Time)
    VALUES (p_band_id, NULL, 'Top-up', p_amount, 0.00, NOW());

    -- Retrieve the updated balance directly from the wristband
    SELECT Wallet_Balance INTO p_new_balance
    FROM RFID_Wristband
    WHERE Band_ID = p_band_id;

    -- Audit log
    INSERT INTO Park_Audit_Log (Event_Type, Band_ID, Reference_ID, Description, Logged_At)
    VALUES ('Wallet_Txn', p_band_id, LAST_INSERT_ID(), 
            CONCAT('Top-up of ₹', p_amount, '. New Balance: ₹', p_new_balance), NOW());

    COMMIT;
END$$
DELIMITER ;

-- 2. PROCEDURE: sp_make_purchase
DROP PROCEDURE IF EXISTS sp_make_purchase;
DELIMITER $$
CREATE PROCEDURE sp_make_purchase(
    IN p_band_id INT,
    IN p_outlet_id INT,
    IN p_amount DECIMAL(10,2),
    OUT p_new_balance DECIMAL(10,2)
)
BEGIN
    DECLARE v_status ENUM('Active', 'Inactive', 'Lost');
    DECLARE v_outlet_name VARCHAR(100);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_amount <= 0.00 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Purchase amount must be greater than zero';
    END IF;

    START TRANSACTION;

    SELECT Status INTO v_status
    FROM RFID_Wristband
    WHERE Band_ID = p_band_id
    FOR UPDATE;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Wristband does not exist';
    ELSEIF v_status != 'Active' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Wristband is Inactive or reported Lost. Transaction denied.';
    END IF;

    SELECT Outlet_Name INTO v_outlet_name
    FROM POS_Outlet
    WHERE Outlet_ID = p_outlet_id;

    IF v_outlet_name IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Selected POS outlet is invalid';
    END IF;

    -- Inserting triggers trg_wallet_transaction_apply (which checks sufficient funds & updates balance)
    INSERT INTO Wallet_Transaction (Band_ID, Outlet_ID, Transaction_Type, Amount, Closing_Balance, Transaction_Time)
    VALUES (p_band_id, p_outlet_id, 'Purchase', p_amount, 0.00, NOW());

    SELECT Wallet_Balance INTO p_new_balance
    FROM RFID_Wristband
    WHERE Band_ID = p_band_id;

    INSERT INTO Park_Audit_Log (Event_Type, Band_ID, Reference_ID, Description, Logged_At)
    VALUES ('Wallet_Txn', p_band_id, LAST_INSERT_ID(), 
            CONCAT('Purchase ₹', p_amount, ' at ', v_outlet_name, '. Closing: ₹', p_new_balance), NOW());

    COMMIT;
END$$
DELIMITER ;

-- 3. PROCEDURE: sp_book_queue_pass
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
    DECLARE v_status ENUM('Active', 'Inactive', 'Lost');
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Check wristband status
    SELECT Status INTO v_status
    FROM RFID_Wristband
    WHERE Band_ID = p_band_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Wristband not found';
    ELSEIF v_status != 'Active' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Wristband is Inactive or Lost. Cannot book queue passes.';
    END IF;

    -- Check height requirement
    SELECT v.Height_cm INTO v_height
    FROM Visitor v
    JOIN RFID_Wristband w ON v.Visitor_ID = w.Visitor_ID
    WHERE w.Band_ID = p_band_id;

    SELECT Attraction_Name, Min_Height_cm, Max_Height_cm INTO v_attr_name, v_min_h, v_max_h
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

    -- Insert pass (trg_no_overlapping_queue_pass enforces no overlap)
    INSERT INTO Virtual_Queue_Pass (Band_ID, Attraction_ID, Slot_Start_Time, Slot_End_Time, Status, Created_At)
    VALUES (p_band_id, p_attraction_id, p_start_time, p_end_time, 'Booked', NOW());

    SET p_pass_id = LAST_INSERT_ID();

    INSERT INTO Park_Audit_Log (Event_Type, Band_ID, Reference_ID, Description, Logged_At)
    VALUES ('Pass_Booking', p_band_id, p_pass_id, 
            CONCAT('Virtual queue pass #', p_pass_id, ' booked for ', v_attr_name, ' (', p_start_time, '-', p_end_time, ')'), NOW());

    COMMIT;
END$$
DELIMITER ;

-- 4. PROCEDURE: sp_cancel_queue_pass
DROP PROCEDURE IF EXISTS sp_cancel_queue_pass;
DELIMITER $$
CREATE PROCEDURE sp_cancel_queue_pass(
    IN p_pass_id INT,
    IN p_band_id INT
)
BEGIN
    DECLARE v_current_status ENUM('Booked', 'Used', 'Cancelled', 'Expired');
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT Status INTO v_current_status
    FROM Virtual_Queue_Pass
    WHERE Pass_ID = p_pass_id AND Band_ID = p_band_id
    FOR UPDATE;

    IF v_current_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Pass not found or does not belong to this wristband';
    ELSEIF v_current_status != 'Booked' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Only Booked passes can be cancelled';
    END IF;

    UPDATE Virtual_Queue_Pass
    SET Status = 'Cancelled'
    WHERE Pass_ID = p_pass_id;

    INSERT INTO Park_Audit_Log (Event_Type, Band_ID, Reference_ID, Description, Logged_At)
    VALUES ('Pass_Cancelled', p_band_id, p_pass_id, 
            CONCAT('Virtual queue pass #', p_pass_id, ' was cancelled by visitor'), NOW());

    COMMIT;
END$$
DELIMITER ;

-- 5. PROCEDURE: sp_ride_tap_in (Turnstile simulation with safety & pass check)
DROP PROCEDURE IF EXISTS sp_ride_tap_in;
DELIMITER $$
CREATE PROCEDURE sp_ride_tap_in(
    IN p_band_id INT,
    IN p_attraction_id INT,
    OUT p_status VARCHAR(20),
    OUT p_reason VARCHAR(255)
)
BEGIN
    DECLARE v_band_status ENUM('Active', 'Inactive', 'Lost');
    DECLARE v_name VARCHAR(100);
    DECLARE v_height DECIMAL(5,1);
    DECLARE v_min_h DECIMAL(5,1);
    DECLARE v_max_h DECIMAL(5,1);
    DECLARE v_attr_name VARCHAR(100);
    DECLARE v_pass_id INT;

    START TRANSACTION;

    SELECT w.Status, v.Full_Name, v.Height_cm 
    INTO v_band_status, v_name, v_height
    FROM RFID_Wristband w
    JOIN Visitor v ON w.Visitor_ID = v.Visitor_ID
    WHERE w.Band_ID = p_band_id;

    IF v_band_status IS NULL THEN
        SET p_status = 'DENIED';
        SET p_reason = 'Wristband not registered in system';
    ELSEIF v_band_status != 'Active' THEN
        SET p_status = 'DENIED';
        SET p_reason = CONCAT('Wristband is ', v_band_status);
    ELSE
        SELECT Attraction_Name, Min_Height_cm, Max_Height_cm 
        INTO v_attr_name, v_min_h, v_max_h
        FROM Attraction
        WHERE Attraction_ID = p_attraction_id;

        IF v_attr_name IS NULL THEN
            SET p_status = 'DENIED';
            SET p_reason = 'Invalid Attraction ID';
        ELSEIF v_height < v_min_h THEN
            SET p_status = 'DENIED';
            SET p_reason = CONCAT('Height check failed: ', v_height, ' cm < minimum required ', v_min_h, ' cm');
        ELSEIF v_height > v_max_h THEN
            SET p_status = 'DENIED';
            SET p_reason = CONCAT('Height check failed: ', v_height, ' cm > maximum limit ', v_max_h, ' cm');
        ELSE
            -- Check if visitor has booked virtual queue pass (or allow stand-by with pass priority)
            SELECT Pass_ID INTO v_pass_id
            FROM Virtual_Queue_Pass
            WHERE Band_ID = p_band_id 
              AND Attraction_ID = p_attraction_id
              AND Status = 'Booked'
            LIMIT 1;

            IF v_pass_id IS NOT NULL THEN
                UPDATE Virtual_Queue_Pass
                SET Status = 'Used'
                WHERE Pass_ID = v_pass_id;
                
                SET p_status = 'GRANTED';
                SET p_reason = CONCAT('Virtual Queue FastPass #', v_pass_id, ' verified! Welcome aboard, ', v_name, '!');
            ELSE
                SET p_status = 'GRANTED';
                SET p_reason = CONCAT('Stand-by entry verified! Welcome aboard, ', v_name, '!');
            END IF;
        END IF;
    END IF;

    -- Audit log
    INSERT INTO Park_Audit_Log (Event_Type, Band_ID, Reference_ID, Description, Logged_At)
    VALUES ('Ride_Tap', p_band_id, p_attraction_id, 
            CONCAT('Turnstile tap at ', COALESCE(v_attr_name, 'Ride #'), ': ', p_status, ' - ', p_reason), NOW());

    COMMIT;
END$$
DELIMITER ;

-- 6. PROCEDURE: sp_rent_locker
DROP PROCEDURE IF EXISTS sp_rent_locker;
DELIMITER $$
CREATE PROCEDURE sp_rent_locker(
    IN p_band_id INT,
    IN p_locker_id INT,
    OUT p_rental_id INT
)
BEGIN
    DECLARE v_active_rental_on_locker INT;
    DECLARE v_active_rental_for_band INT;
    DECLARE v_band_status ENUM('Active', 'Inactive', 'Lost');
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT Status INTO v_band_status
    FROM RFID_Wristband
    WHERE Band_ID = p_band_id;

    IF v_band_status IS NULL OR v_band_status != 'Active' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Active wristband required to rent a locker';
    END IF;

    -- Check if locker is already occupied
    SELECT COUNT(*) INTO v_active_rental_on_locker
    FROM Locker_Rental
    WHERE Locker_ID = p_locker_id AND Status = 'Active';

    IF v_active_rental_on_locker > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Selected locker is currently occupied by another visitor';
    END IF;

    -- Check if visitor already has an active locker
    SELECT COUNT(*) INTO v_active_rental_for_band
    FROM Locker_Rental
    WHERE Band_ID = p_band_id AND Status = 'Active';

    IF v_active_rental_for_band > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Wristband already holds an active locker rental. Release it first.';
    END IF;

    INSERT INTO Locker_Rental (Locker_ID, Band_ID, Rental_Start_Time, Rental_End_Time, Status)
    VALUES (p_locker_id, p_band_id, NOW(), NULL, 'Active');

    SET p_rental_id = LAST_INSERT_ID();

    COMMIT;
END$$
DELIMITER ;

-- 7. PROCEDURE: sp_release_locker
DROP PROCEDURE IF EXISTS sp_release_locker;
DELIMITER $$
CREATE PROCEDURE sp_release_locker(
    IN p_rental_id INT,
    IN p_band_id INT
)
BEGIN
    DECLARE v_status ENUM('Active', 'Released');
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Admin may pass p_band_id = 0 to force-release
    IF p_band_id > 0 THEN
        SELECT Status INTO v_status
        FROM Locker_Rental
        WHERE Rental_ID = p_rental_id AND Band_ID = p_band_id
        FOR UPDATE;
    ELSE
        SELECT Status INTO v_status
        FROM Locker_Rental
        WHERE Rental_ID = p_rental_id
        FOR UPDATE;
    END IF;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Rental record not found';
    ELSEIF v_status = 'Released' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Locker has already been released';
    END IF;

    UPDATE Locker_Rental
    SET Status = 'Released', Rental_End_Time = NOW()
    WHERE Rental_ID = p_rental_id;

    COMMIT;
END$$
DELIMITER ;

-- 8. PROCEDURE: sp_register_visitor_with_band (One atomic transaction with rollback)
DROP PROCEDURE IF EXISTS sp_register_visitor_with_band;
DELIMITER $$
CREATE PROCEDURE sp_register_visitor_with_band(
    IN p_name VARCHAR(100),
    IN p_height DECIMAL(5,1),
    IN p_email VARCHAR(100),
    IN p_phone VARCHAR(20),
    IN p_opening_balance DECIMAL(10,2),
    IN p_pin_hash VARCHAR(255),
    OUT p_visitor_id INT,
    OUT p_band_uid VARCHAR(20)
)
BEGIN
    DECLARE v_random_suffix VARCHAR(6);
    DECLARE v_band_id INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_height <= 0.0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Visitor height must be positive';
    END IF;

    IF p_opening_balance < 0.00 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Opening balance cannot be negative';
    END IF;

    START TRANSACTION;

    -- Step 1: Insert Visitor
    INSERT INTO Visitor (Full_Name, Height_cm, Email, Phone, Registration_Date)
    VALUES (p_name, p_height, p_email, p_phone, NOW());

    SET p_visitor_id = LAST_INSERT_ID();

    -- Step 2: Generate unique Band_UID (format: UID-X999)
    SET v_random_suffix = LPAD(FLOOR(RAND() * 900000 + 100000), 6, '0');
    SET p_band_uid = CONCAT('UID-', SUBSTRING(p_name, 1, 1), v_random_suffix);

    -- Step 3: Insert RFID Wristband (1:1 with Visitor)
    INSERT INTO RFID_Wristband (Band_UID, Visitor_ID, Wallet_Balance, Status, Pin_Hash)
    VALUES (p_band_uid, p_visitor_id, 0.00, 'Active', 
            COALESCE(p_pin_hash, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'));

    SET v_band_id = LAST_INSERT_ID();

    -- Step 4: Optional Opening Balance Top-up
    IF p_opening_balance > 0.00 THEN
        INSERT INTO Wallet_Transaction (Band_ID, Outlet_ID, Transaction_Type, Amount, Closing_Balance, Transaction_Time)
        VALUES (v_band_id, NULL, 'Top-up', p_opening_balance, 0.00, NOW());
    END IF;

    -- Step 5: Audit Log
    INSERT INTO Park_Audit_Log (Event_Type, Band_ID, Reference_ID, Description, Logged_At)
    VALUES ('Wristband_Status', v_band_id, p_visitor_id, 
            CONCAT('Visitor ', p_name, ' registered with Wristband ', p_band_uid, ' (Float: ₹', p_opening_balance, ')'), NOW());

    COMMIT;
END$$
DELIMITER ;
