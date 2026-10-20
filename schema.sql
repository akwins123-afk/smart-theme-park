-- ====================================================================
-- SMART THEME PARK: RFID WRISTBAND & VIRTUAL QUEUE MANAGEMENT SYSTEM
-- Base Relational Schema (3NF) - Database Management Systems (Review 2/3)
-- Authors: Akash R (25BCE5354), Vasisht V (25BCE5748), Sri Balaji V (25BCE5697)
-- ====================================================================

CREATE DATABASE IF NOT EXISTS smart_theme_park;
USE smart_theme_park;

-- 1. VISITOR TABLE (Demographics & profile)
CREATE TABLE IF NOT EXISTS Visitor (
    Visitor_ID INT AUTO_INCREMENT PRIMARY KEY,
    Full_Name VARCHAR(100) NOT NULL,
    Height_cm DECIMAL(5,1) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    Phone VARCHAR(20) NOT NULL,
    Registration_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_visitor_height CHECK (Height_cm > 0.0)
) ENGINE=InnoDB;

-- 2. RFID WRISTBAND TABLE (1:1 with Visitor, Contactless Wallet & Digital ID)
CREATE TABLE IF NOT EXISTS RFID_Wristband (
    Band_ID INT AUTO_INCREMENT PRIMARY KEY,
    Band_UID VARCHAR(20) NOT NULL UNIQUE,
    Visitor_ID INT NOT NULL UNIQUE,
    Wallet_Balance DECIMAL(10,2) DEFAULT 0.00,
    Status ENUM('Active', 'Inactive', 'Lost') DEFAULT 'Active',
    CONSTRAINT fk_wristband_visitor 
        FOREIGN KEY (Visitor_ID) REFERENCES Visitor(Visitor_ID) 
        ON DELETE CASCADE,
    CONSTRAINT chk_balance 
        CHECK (Wallet_Balance >= 0.00)
) ENGINE=InnoDB;

-- 3. ATTRACTION TABLE (Rides, safety rules & capacity)
CREATE TABLE IF NOT EXISTS Attraction (
    Attraction_ID INT AUTO_INCREMENT PRIMARY KEY,
    Attraction_Name VARCHAR(100) NOT NULL,
    Category ENUM('Thrill', 'Water', 'Family', 'Theater') NOT NULL,
    Min_Height_cm DECIMAL(5,1) NOT NULL,
    Max_Height_cm DECIMAL(5,1) NOT NULL,
    Capacity_Per_Slot INT DEFAULT 30,
    Thrill_Level ENUM('Low', 'Moderate', 'High', 'Extreme') DEFAULT 'Moderate',
    CONSTRAINT chk_height_band 
        CHECK (Max_Height_cm >= Min_Height_cm AND Min_Height_cm > 0.0)
) ENGINE=InnoDB;

-- 4. VIRTUAL QUEUE PASS TABLE (FastPass reservations: 1:N from Band & Attraction)
CREATE TABLE IF NOT EXISTS Virtual_Queue_Pass (
    Pass_ID INT AUTO_INCREMENT PRIMARY KEY,
    Band_ID INT NOT NULL,
    Attraction_ID INT NOT NULL,
    Slot_Start_Time TIME NOT NULL,
    Slot_End_Time TIME NOT NULL,
    Status ENUM('Booked', 'Used', 'Cancelled', 'Expired') DEFAULT 'Booked',
    Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pass_band 
        FOREIGN KEY (Band_ID) REFERENCES RFID_Wristband(Band_ID) 
        ON DELETE CASCADE,
    CONSTRAINT fk_pass_attraction 
        FOREIGN KEY (Attraction_ID) REFERENCES Attraction(Attraction_ID) 
        ON DELETE CASCADE,
    CONSTRAINT chk_slot_time 
        CHECK (Slot_End_Time > Slot_Start_Time)
) ENGINE=InnoDB;

-- 5. LOCKER TABLE (Physical smart lockers across park zones)
CREATE TABLE IF NOT EXISTS Locker (
    Locker_ID INT AUTO_INCREMENT PRIMARY KEY,
    Zone VARCHAR(50) NOT NULL,
    Number VARCHAR(10) NOT NULL,
    CONSTRAINT uq_locker_zone_num UNIQUE (Zone, Number)
) ENGINE=InnoDB;

-- 6. LOCKER RENTAL TABLE (One active visitor per locker at a time)
CREATE TABLE IF NOT EXISTS Locker_Rental (
    Rental_ID INT AUTO_INCREMENT PRIMARY KEY,
    Locker_ID INT NOT NULL,
    Band_ID INT NOT NULL,
    Rental_Start_Time DATETIME DEFAULT CURRENT_TIMESTAMP,
    Rental_End_Time DATETIME NULL,
    Status ENUM('Active', 'Released') DEFAULT 'Active',
    CONSTRAINT fk_rental_locker 
        FOREIGN KEY (Locker_ID) REFERENCES Locker(Locker_ID) 
        ON DELETE CASCADE,
    CONSTRAINT fk_rental_band 
        FOREIGN KEY (Band_ID) REFERENCES RFID_Wristband(Band_ID) 
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. POS OUTLET TABLE (Retail, F&B, Merchandise, Photo points)
CREATE TABLE IF NOT EXISTS POS_Outlet (
    Outlet_ID INT AUTO_INCREMENT PRIMARY KEY,
    Outlet_Name VARCHAR(100) NOT NULL,
    Type ENUM('F&B', 'Souvenirs', 'Photo') NOT NULL
) ENGINE=InnoDB;

-- 8. WALLET TRANSACTION TABLE (Immutable ledger of top-ups & purchases)
CREATE TABLE IF NOT EXISTS Wallet_Transaction (
    Transaction_ID INT AUTO_INCREMENT PRIMARY KEY,
    Band_ID INT NOT NULL,
    Outlet_ID INT NULL,
    Transaction_Type ENUM('Top-up', 'Purchase', 'Refund') NOT NULL,
    Amount DECIMAL(10,2) NOT NULL,
    Closing_Balance DECIMAL(10,2) NOT NULL,
    Transaction_Time DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_txn_band 
        FOREIGN KEY (Band_ID) REFERENCES RFID_Wristband(Band_ID) 
        ON DELETE CASCADE,
    CONSTRAINT fk_txn_outlet 
        FOREIGN KEY (Outlet_ID) REFERENCES POS_Outlet(Outlet_ID) 
        ON DELETE SET NULL,
    CONSTRAINT chk_txn_amount 
        CHECK (Amount > 0.00),
    CONSTRAINT chk_txn_closing_balance 
        CHECK (Closing_Balance >= 0.00)
) ENGINE=InnoDB;

-- ====================================================================
-- TRIGGERS (Enforcing Complex Business Rules Beyond CHECK Constraints)
-- ====================================================================

-- Trigger 1: Blocks overlapping virtual queue time slots for the same wristband
DROP TRIGGER IF EXISTS trg_no_overlapping_queue_pass;
DELIMITER $$
CREATE TRIGGER trg_no_overlapping_queue_pass
BEFORE INSERT ON Virtual_Queue_Pass
FOR EACH ROW
BEGIN
    DECLARE overlap_count INT;
    IF NEW.Status = 'Booked' THEN
        SELECT COUNT(*) INTO overlap_count
        FROM Virtual_Queue_Pass
        WHERE Band_ID = NEW.Band_ID
          AND Status = 'Booked'
          AND (NEW.Slot_Start_Time < Slot_End_Time AND NEW.Slot_End_Time > Slot_Start_Time);

        IF overlap_count > 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Overlapping virtual queue slot for this wristband';
        END IF;
    END IF;
END$$
DELIMITER ;

-- Trigger 2: Validates balance, blocks overdraw, calculates Closing_Balance,
-- and updates RFID_Wristband.Wallet_Balance atomically.
DROP TRIGGER IF EXISTS trg_wallet_transaction_apply;
DELIMITER $$
CREATE TRIGGER trg_wallet_transaction_apply
BEFORE INSERT ON Wallet_Transaction
FOR EACH ROW
BEGIN
    DECLARE curr_balance DECIMAL(10,2);
    
    SELECT Wallet_Balance INTO curr_balance
    FROM RFID_Wristband
    WHERE Band_ID = NEW.Band_ID
    FOR UPDATE;

    IF curr_balance IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Wristband not found';
    END IF;

    IF NEW.Transaction_Type = 'Purchase' THEN
        IF curr_balance < NEW.Amount THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Insufficient wallet balance for purchase';
        END IF;
        SET NEW.Closing_Balance = curr_balance - NEW.Amount;
    ELSEIF NEW.Transaction_Type IN ('Top-up', 'Refund') THEN
        SET NEW.Closing_Balance = curr_balance + NEW.Amount;
    END IF;

    UPDATE RFID_Wristband
    SET Wallet_Balance = NEW.Closing_Balance
    WHERE Band_ID = NEW.Band_ID;
END$$
DELIMITER ;

-- ====================================================================
-- VIEWS (Consolidated Operational & Analytical Reporting)
-- ====================================================================

-- View 1: 360-degree consolidated profile per visitor
CREATE OR REPLACE VIEW Vw_Visitor_360 AS
SELECT 
    v.Visitor_ID,
    v.Full_Name,
    v.Height_cm,
    v.Email,
    v.Phone,
    w.Band_ID,
    w.Band_UID,
    w.Wallet_Balance,
    w.Status AS Wristband_Status,
    COUNT(DISTINCT q.Pass_ID) AS Total_Queue_Passes,
    COUNT(DISTINCT CASE WHEN q.Status = 'Booked' THEN q.Pass_ID END) AS Active_Queue_Passes,
    COUNT(DISTINCT r.Rental_ID) AS Total_Locker_Rentals,
    COUNT(DISTINCT CASE WHEN r.Status = 'Active' THEN r.Rental_ID END) AS Active_Locker_Rentals,
    COALESCE(SUM(CASE WHEN t.Transaction_Type = 'Purchase' THEN t.Amount ELSE 0 END), 0.00) AS Total_Spent_INR
FROM Visitor v
LEFT JOIN RFID_Wristband w ON v.Visitor_ID = w.Visitor_ID
LEFT JOIN Virtual_Queue_Pass q ON w.Band_ID = q.Band_ID
LEFT JOIN Locker_Rental r ON w.Band_ID = r.Band_ID
LEFT JOIN Wallet_Transaction t ON w.Band_ID = t.Band_ID
GROUP BY v.Visitor_ID, v.Full_Name, v.Height_cm, v.Email, v.Phone, w.Band_ID, w.Band_UID, w.Wallet_Balance, w.Status;

-- View 2: Revenue, transaction volume, and average spend per POS outlet
CREATE OR REPLACE VIEW Vw_Outlet_Revenue AS
SELECT 
    p.Outlet_ID,
    p.Outlet_Name,
    p.Type AS Outlet_Type,
    COUNT(t.Transaction_ID) AS Total_Transactions,
    COALESCE(SUM(t.Amount), 0.00) AS Total_Revenue_INR,
    COALESCE(AVG(t.Amount), 0.00) AS Avg_Transaction_Value_INR
FROM POS_Outlet p
LEFT JOIN Wallet_Transaction t 
    ON p.Outlet_ID = t.Outlet_ID AND t.Transaction_Type = 'Purchase'
GROUP BY p.Outlet_ID, p.Outlet_Name, p.Type;
