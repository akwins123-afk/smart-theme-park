-- ====================================================================
-- MIGRATION 002: Park_Audit_Log Table & Locker Rental Audit Trigger
-- Enforces immutable operational audit trail for safety & compliance
-- ====================================================================

USE smart_theme_park;

CREATE TABLE IF NOT EXISTS Park_Audit_Log (
    Log_ID INT AUTO_INCREMENT PRIMARY KEY,
    Event_Type ENUM('Wallet_Txn', 'Ride_Tap', 'Locker_Event', 'Pass_Booking', 'Pass_Cancelled', 'Wristband_Status') NOT NULL,
    Band_ID INT NULL,
    Reference_ID INT NULL,
    Description TEXT NOT NULL,
    Logged_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_band 
        FOREIGN KEY (Band_ID) REFERENCES RFID_Wristband(Band_ID) 
        ON DELETE SET NULL
) ENGINE=InnoDB;

-- Trigger: Audit locker rentals on insert
DROP TRIGGER IF EXISTS trg_audit_locker_rental_insert;
DELIMITER $$
CREATE TRIGGER trg_audit_locker_rental_insert
AFTER INSERT ON Locker_Rental
FOR EACH ROW
BEGIN
    DECLARE locker_info VARCHAR(100);
    SELECT CONCAT(Zone, ' ', Number) INTO locker_info
    FROM Locker
    WHERE Locker_ID = NEW.Locker_ID;

    INSERT INTO Park_Audit_Log (Event_Type, Band_ID, Reference_ID, Description, Logged_At)
    VALUES ('Locker_Event', NEW.Band_ID, NEW.Rental_ID, 
            CONCAT('Locker ', COALESCE(locker_info, NEW.Locker_ID), ' rented (Rental #', NEW.Rental_ID, ')'),
            NOW());
END$$
DELIMITER ;

-- Trigger: Audit locker releases on update
DROP TRIGGER IF EXISTS trg_audit_locker_rental_update;
DELIMITER $$
CREATE TRIGGER trg_audit_locker_rental_update
AFTER UPDATE ON Locker_Rental
FOR EACH ROW
BEGIN
    DECLARE locker_info VARCHAR(100);
    IF OLD.Status = 'Active' AND NEW.Status = 'Released' THEN
        SELECT CONCAT(Zone, ' ', Number) INTO locker_info
        FROM Locker
        WHERE Locker_ID = NEW.Locker_ID;

        INSERT INTO Park_Audit_Log (Event_Type, Band_ID, Reference_ID, Description, Logged_At)
        VALUES ('Locker_Event', NEW.Band_ID, NEW.Rental_ID, 
                CONCAT('Locker ', COALESCE(locker_info, NEW.Locker_ID), ' released (Rental #', NEW.Rental_ID, ')'),
                NOW());
    END IF;
END$$
DELIMITER ;
