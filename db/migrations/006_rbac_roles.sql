-- ====================================================================
-- MIGRATION 006: Role-Based Access Control (RBAC) & Database Privileges
-- Creates distinct MySQL users & grants for least-privilege security
-- ====================================================================

-- 1. Create Users if they don't exist
CREATE USER IF NOT EXISTS 'park_admin'@'%' IDENTIFIED BY 'AdminPass@2026';
CREATE USER IF NOT EXISTS 'park_customer'@'%' IDENTIFIED BY 'CustomerPass@2026';
CREATE USER IF NOT EXISTS 'ride_staff'@'%' IDENTIFIED BY 'RideStaff@2026';
CREATE USER IF NOT EXISTS 'pos_operator'@'%' IDENTIFIED BY 'PosOp@2026';

-- Allow localhost connections as well
CREATE USER IF NOT EXISTS 'park_admin'@'localhost' IDENTIFIED BY 'AdminPass@2026';
CREATE USER IF NOT EXISTS 'park_customer'@'localhost' IDENTIFIED BY 'CustomerPass@2026';
CREATE USER IF NOT EXISTS 'ride_staff'@'localhost' IDENTIFIED BY 'RideStaff@2026';
CREATE USER IF NOT EXISTS 'pos_operator'@'localhost' IDENTIFIED BY 'PosOp@2026';

-- 2. PARK ADMIN: Full administrative privileges
GRANT ALL PRIVILEGES ON smart_theme_park.* TO 'park_admin'@'%';
GRANT ALL PRIVILEGES ON smart_theme_park.* TO 'park_admin'@'localhost';

-- 3. PARK CUSTOMER: Strictly read safe views and execute self-service procedures
GRANT SELECT ON smart_theme_park.Attraction TO 'park_customer'@'%', 'park_customer'@'localhost';
GRANT SELECT ON smart_theme_park.Locker TO 'park_customer'@'%', 'park_customer'@'localhost';
GRANT SELECT ON smart_theme_park.Vw_My_Pass_Details TO 'park_customer'@'%', 'park_customer'@'localhost';
GRANT SELECT ON smart_theme_park.Vw_Attraction_Live_Load TO 'park_customer'@'%', 'park_customer'@'localhost';
GRANT SELECT ON smart_theme_park.RFID_Wristband TO 'park_customer'@'%', 'park_customer'@'localhost';
GRANT SELECT ON smart_theme_park.Wallet_Transaction TO 'park_customer'@'%', 'park_customer'@'localhost';
GRANT SELECT ON smart_theme_park.Locker_Rental TO 'park_customer'@'%', 'park_customer'@'localhost';
GRANT SELECT ON smart_theme_park.Virtual_Queue_Pass TO 'park_customer'@'%', 'park_customer'@'localhost';
GRANT SELECT ON smart_theme_park.POS_Outlet TO 'park_customer'@'%', 'park_customer'@'localhost';
GRANT EXECUTE ON PROCEDURE smart_theme_park.sp_book_queue_pass TO 'park_customer'@'%', 'park_customer'@'localhost';
GRANT EXECUTE ON PROCEDURE smart_theme_park.sp_cancel_queue_pass TO 'park_customer'@'%', 'park_customer'@'localhost';
GRANT EXECUTE ON PROCEDURE smart_theme_park.sp_rent_locker TO 'park_customer'@'%', 'park_customer'@'localhost';
GRANT EXECUTE ON PROCEDURE smart_theme_park.sp_release_locker TO 'park_customer'@'%', 'park_customer'@'localhost';

-- 4. RIDE STAFF: Turnstile execution and attraction validation
GRANT SELECT ON smart_theme_park.Attraction TO 'ride_staff'@'%', 'ride_staff'@'localhost';
GRANT SELECT ON smart_theme_park.Virtual_Queue_Pass TO 'ride_staff'@'%', 'ride_staff'@'localhost';
GRANT EXECUTE ON PROCEDURE smart_theme_park.sp_ride_tap_in TO 'ride_staff'@'%', 'ride_staff'@'localhost';

-- 5. POS OPERATOR: Point-of-sale execution and top-up procedures
GRANT SELECT ON smart_theme_park.POS_Outlet TO 'pos_operator'@'%', 'pos_operator'@'localhost';
GRANT EXECUTE ON PROCEDURE smart_theme_park.sp_make_purchase TO 'pos_operator'@'%', 'pos_operator'@'localhost';
GRANT EXECUTE ON PROCEDURE smart_theme_park.sp_top_up_wallet TO 'pos_operator'@'%', 'pos_operator'@'localhost';

FLUSH PRIVILEGES;
