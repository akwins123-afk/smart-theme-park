-- ====================================================================
-- MIGRATION 009: Account Activation & Opening Float Allotment
-- Enforces that newly registered accounts start 'Pending' with ₹0
-- and cannot use park services until staff allots an opening float.
-- ====================================================================

USE smart_theme_park;

-- 1. Add 'Pending' to RFID_Wristband.Status ENUM
ALTER TABLE RFID_Wristband 
MODIFY COLUMN Status ENUM('Active', 'Inactive', 'Lost', 'Pending') NOT NULL DEFAULT 'Active';

-- 2. New table Account_Activation
CREATE TABLE IF NOT EXISTS Account_Activation (
    Activation_ID INT AUTO_INCREMENT PRIMARY KEY,
    Band_ID INT NOT NULL UNIQUE,
    Opening_Amount DECIMAL(10,2) NOT NULL CHECK (Opening_Amount > 0),
    Allocated_By VARCHAR(50) NOT NULL,
    Allocated_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    Payment_Mode ENUM('Cash', 'UPI', 'Card') NOT NULL,
    Remarks VARCHAR(200) DEFAULT NULL,
    CONSTRAINT fk_act_band FOREIGN KEY (Band_ID) REFERENCES RFID_Wristband(Band_ID) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Procedure sp_register_account
DROP PROCEDURE IF EXISTS sp_register_account;
DELIMITER $$
CREATE PROCEDURE sp_register_account(
    IN p_full_name VARCHAR(100),
    IN p_height_cm DECIMAL(5,1),
    IN p_email VARCHAR(100),
    IN p_phone VARCHAR(20),
    IN p_pin_hash VARCHAR(255),
    OUT out_band_id INT,
    OUT out_band_uid VARCHAR(20)
)
proc_reg: BEGIN
    DECLARE v_visitor_id INT;
    DECLARE v_rand_num INT;
    DECLARE v_band_uid VARCHAR(20);
    DECLARE v_exists INT DEFAULT 1;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Insert into Visitor
    INSERT INTO Visitor (Full_Name, Height_cm, Email, Phone, Registration_Date)
    VALUES (p_full_name, p_height_cm, p_email, p_phone, NOW());
    SET v_visitor_id = LAST_INSERT_ID();

    -- Generate unique Band_UID: e.g. UID-PXXXX
    WHILE v_exists > 0 DO
        SET v_rand_num = FLOOR(1000 + (RAND() * 9000));
        SET v_band_uid = CONCAT('UID-P', v_rand_num);
        SELECT COUNT(*) INTO v_exists FROM RFID_Wristband WHERE Band_UID = v_band_uid;
    END WHILE;

    -- Insert RFID_Wristband with Status 'Pending' and balance 0.00
    INSERT INTO RFID_Wristband (Band_UID, Visitor_ID, Wallet_Balance, Status, Pin_Hash)
    VALUES (v_band_uid, v_visitor_id, 0.00, 'Pending', p_pin_hash);
    SET out_band_id = LAST_INSERT_ID();
    SET out_band_uid = v_band_uid;

    COMMIT;
END$$
DELIMITER ;

-- 4. Procedure sp_activate_account
DROP PROCEDURE IF EXISTS sp_activate_account;
DELIMITER $$
CREATE PROCEDURE sp_activate_account(
    IN p_band_id INT,
    IN p_amount DECIMAL(10,2),
    IN p_admin_name VARCHAR(50),
    IN p_payment_mode ENUM('Cash', 'UPI', 'Card'),
    IN p_remarks VARCHAR(200)
)
proc_act: BEGIN
    DECLARE v_status ENUM('Active', 'Inactive', 'Lost', 'Pending');

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Check band status
    SELECT Status INTO v_status FROM RFID_Wristband WHERE Band_ID = p_band_id FOR UPDATE;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Wristband not found';
    END IF;

    IF v_status <> 'Pending' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account is not Pending activation';
    END IF;

    IF p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Activation opening amount must be greater than zero';
    END IF;

    -- Insert Top-up into Wallet_Transaction (existing trigger trg_wallet_transaction_apply updates balance)
    INSERT INTO Wallet_Transaction (Band_ID, Outlet_ID, Transaction_Type, Amount, Closing_Balance, Transaction_Time, Notes)
    VALUES (p_band_id, NULL, 'Top-up', p_amount, 0.00, NOW(), CONCAT('Account Activation: Opening Float (', p_payment_mode, ')'));

    -- Insert Account_Activation row
    INSERT INTO Account_Activation (Band_ID, Opening_Amount, Allocated_By, Allocated_At, Payment_Mode, Remarks)
    VALUES (p_band_id, p_amount, p_admin_name, NOW(), p_payment_mode, p_remarks);

    -- Set Status = 'Active' (trigger verifies Account_Activation row exists)
    UPDATE RFID_Wristband SET Status = 'Active' WHERE Band_ID = p_band_id;

    COMMIT;
END$$
DELIMITER ;

-- 5. Trigger: block non-Active band on Virtual_Queue_Pass
DROP TRIGGER IF EXISTS trg_block_unactivated_queue_pass;
DELIMITER $$
CREATE TRIGGER trg_block_unactivated_queue_pass
BEFORE INSERT ON Virtual_Queue_Pass
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(20);
    SELECT Status INTO v_status FROM RFID_Wristband WHERE Band_ID = NEW.Band_ID;
    IF v_status IS NULL OR v_status <> 'Active' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account not activated: admin must allot an amount first';
    END IF;
END$$
DELIMITER ;

-- 6. Trigger: block non-Active band on Locker_Rental
DROP TRIGGER IF EXISTS trg_block_unactivated_locker_rental;
DELIMITER $$
CREATE TRIGGER trg_block_unactivated_locker_rental
BEFORE INSERT ON Locker_Rental
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(20);
    SELECT Status INTO v_status FROM RFID_Wristband WHERE Band_ID = NEW.Band_ID;
    IF v_status IS NULL OR v_status <> 'Active' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account not activated: admin must allot an amount first';
    END IF;
END$$
DELIMITER ;

-- 7. Trigger: block non-Active band on Wallet_Transaction (Purchase)
DROP TRIGGER IF EXISTS trg_block_unactivated_purchase;
DELIMITER $$
CREATE TRIGGER trg_block_unactivated_purchase
BEFORE INSERT ON Wallet_Transaction
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(20);
    IF NEW.Transaction_Type = 'Purchase' THEN
        SELECT Status INTO v_status FROM RFID_Wristband WHERE Band_ID = NEW.Band_ID;
        IF v_status IS NULL OR v_status <> 'Active' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account not activated: admin must allot an amount first';
        END IF;
    END IF;
END$$
DELIMITER ;

-- 8. Trigger: block Pending -> Active unless Account_Activation row exists
DROP TRIGGER IF EXISTS trg_block_unauthorized_activation;
DELIMITER $$
CREATE TRIGGER trg_block_unauthorized_activation
BEFORE UPDATE ON RFID_Wristband
FOR EACH ROW
BEGIN
    IF OLD.Status = 'Pending' AND NEW.Status = 'Active' THEN
        IF NOT EXISTS (SELECT 1 FROM Account_Activation WHERE Band_ID = NEW.Band_ID) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot activate account: no Account_Activation allocation record exists';
        END IF;
    END IF;
END$$
DELIMITER ;

-- 9. Grants for role-based security
GRANT EXECUTE ON PROCEDURE smart_theme_park.sp_register_account TO 'park_customer'@'%', 'park_customer'@'localhost';
GRANT EXECUTE ON PROCEDURE smart_theme_park.sp_activate_account TO 'park_admin'@'%', 'park_admin'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON smart_theme_park.Account_Activation TO 'park_admin'@'%', 'park_admin'@'localhost';
GRANT SELECT ON smart_theme_park.Account_Activation TO 'park_customer'@'%', 'park_customer'@'localhost';

FLUSH PRIVILEGES;
