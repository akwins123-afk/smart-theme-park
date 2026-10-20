-- ====================================================================
-- MIGRATION 007: Expand Attraction Roster with Disney World & Wonderla Rides
-- Adds Image_URL & Park_Land columns (additive) and populates 12 iconic rides
-- ====================================================================

USE smart_theme_park;

-- 1. Additive columns: Image_URL and Park_Land
SET @col_img_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'smart_theme_park' 
      AND TABLE_NAME = 'Attraction' 
      AND COLUMN_NAME = 'Image_URL'
);

SET @sql_img = IF(@col_img_exists = 0, 
    'ALTER TABLE Attraction ADD COLUMN Image_URL VARCHAR(500) DEFAULT NULL, ADD COLUMN Park_Land VARCHAR(100) DEFAULT \"Theme Park Realm\"', 
    'SELECT \"Columns already exist\"'
);

PREPARE stmt_img FROM @sql_img;
EXECUTE stmt_img;
DEALLOCATE PREPARE stmt_img;

-- 2. Update existing 6 Review 2 attractions with real theme park photos & lands
UPDATE Attraction SET 
    Image_URL = 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?auto=format&fit=crop&w=800&q=80',
    Park_Land = 'Wonderla High Thrills'
WHERE Attraction_ID = 1;

UPDATE Attraction SET 
    Image_URL = 'https://images.unsplash.com/photo-1582650625119-3a31f8418b7d?auto=format&fit=crop&w=800&q=80',
    Park_Land = 'Wonderla Water Haven'
WHERE Attraction_ID = 2;

UPDATE Attraction SET 
    Image_URL = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
    Park_Land = 'Disney Tomorrowland'
WHERE Attraction_ID = 3;

UPDATE Attraction SET 
    Image_URL = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
    Park_Land = 'Wonderla High Thrills'
WHERE Attraction_ID = 4;

UPDATE Attraction SET 
    Image_URL = 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    Park_Land = 'Disney Adventureland'
WHERE Attraction_ID = 5;

UPDATE Attraction SET 
    Image_URL = 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800&q=80',
    Park_Land = 'Disney Tomorrowland'
WHERE Attraction_ID = 6;

-- 3. Insert Iconic Disney World & Wonderla Rides (IDs 7 to 18)
INSERT INTO Attraction (Attraction_ID, Attraction_Name, Category, Min_Height_cm, Max_Height_cm, Capacity_Per_Slot, Thrill_Level, Image_URL, Park_Land) 
VALUES
(7, 'Space Mountain', 'Thrill', 112.0, 215.0, 40, 'Extreme', 
 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?auto=format&fit=crop&w=800&q=80', 
 'Disney Magic Kingdom · Tomorrowland'),

(8, 'Avatar Flight of Passage', 'Theater', 112.0, 220.0, 48, 'High', 
 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80', 
 'Disney Animal Kingdom · Pandora'),

(9, 'Star Wars: Rise of the Resistance', 'Thrill', 102.0, 225.0, 50, 'Extreme', 
 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80', 
 'Disney Hollywood Studios · Galaxy\'s Edge'),

(10, 'Big Thunder Mountain Railroad', 'Thrill', 102.0, 210.0, 35, 'Moderate', 
 'https://images.unsplash.com/photo-1508873696983-2df5293cb325?auto=format&fit=crop&w=800&q=80', 
 'Disney Magic Kingdom · Frontierland'),

(11, 'TRON Lightcycle / Run', 'Thrill', 122.0, 215.0, 36, 'Extreme', 
 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800&q=80', 
 'Disney Magic Kingdom · Tomorrowland'),

(12, 'Expedition Everest: Legend of Forbidden Mountain', 'Thrill', 112.0, 210.0, 36, 'High', 
 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80', 
 'Disney Animal Kingdom · Asia'),

(13, 'Peter Pan\'s Flight', 'Family', 80.0, 230.0, 45, 'Low', 
 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80', 
 'Disney Magic Kingdom · Fantasyland'),

(14, 'Twilight Zone Tower of Terror', 'Thrill', 102.0, 215.0, 30, 'Extreme', 
 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80', 
 'Disney Hollywood Studios · Sunset Blvd'),

(15, 'Recoil Rollercoaster', 'Thrill', 140.0, 210.0, 32, 'Extreme', 
 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?auto=format&fit=crop&w=800&q=80', 
 'Wonderla Bangalore · Thrill Zone'),

(16, 'Wonderla Flash Tower', 'Thrill', 130.0, 205.0, 24, 'High', 
 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80', 
 'Wonderla Bangalore · Sky Tower Zone'),

(17, 'Wonder Splash Chute', 'Water', 110.0, 215.0, 35, 'Moderate', 
 'https://images.unsplash.com/photo-1582650625119-3a31f8418b7d?auto=format&fit=crop&w=800&q=80', 
 'Wonderla Bangalore · Water Wonderland'),

(18, 'Jungle Safari 4D Adventure', 'Theater', 90.0, 225.0, 60, 'Low', 
 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80', 
 'Wonderla Bangalore · Family Hub')
ON DUPLICATE KEY UPDATE 
    Attraction_Name = VALUES(Attraction_Name),
    Category = VALUES(Category),
    Min_Height_cm = VALUES(Min_Height_cm),
    Max_Height_cm = VALUES(Max_Height_cm),
    Capacity_Per_Slot = VALUES(Capacity_Per_Slot),
    Thrill_Level = VALUES(Thrill_Level),
    Image_URL = VALUES(Image_URL),
    Park_Land = VALUES(Park_Land);

-- 4. Re-create Vw_Attraction_Live_Load to expose Image_URL and Park_Land
CREATE OR REPLACE VIEW Vw_Attraction_Live_Load AS
SELECT 
    a.Attraction_ID,
    a.Attraction_Name,
    a.Category,
    a.Min_Height_cm,
    a.Max_Height_cm,
    a.Capacity_Per_Slot,
    a.Thrill_Level,
    COALESCE(a.Image_URL, 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?auto=format&fit=crop&w=800&q=80') AS Image_URL,
    COALESCE(a.Park_Land, 'Theme Park Realm') AS Park_Land,
    COUNT(CASE WHEN q.Status = 'Booked' THEN 1 END) AS Active_Booked_Passes,
    ROUND(LEAST(120, (COUNT(CASE WHEN q.Status = 'Booked' THEN 1 END) / GREATEST(1, a.Capacity_Per_Slot)) * 30 + 15)) AS Estimated_Wait_Min,
    CASE 
        WHEN COUNT(CASE WHEN q.Status = 'Booked' THEN 1 END) >= a.Capacity_Per_Slot THEN 'Capacity Full'
        WHEN COUNT(CASE WHEN q.Status = 'Booked' THEN 1 END) >= (a.Capacity_Per_Slot * 0.7) THEN 'High Demand'
        WHEN COUNT(CASE WHEN q.Status = 'Booked' THEN 1 END) >= (a.Capacity_Per_Slot * 0.3) THEN 'Moderate'
        ELSE 'Low Wait'
    END AS Congestion_Status
FROM Attraction a
LEFT JOIN Virtual_Queue_Pass q ON a.Attraction_ID = q.Attraction_ID
GROUP BY a.Attraction_ID, a.Attraction_Name, a.Category, a.Min_Height_cm, a.Max_Height_cm, a.Capacity_Per_Slot, a.Thrill_Level, a.Image_URL, a.Park_Land;

-- 5. Re-create Vw_My_Pass_Details to also include Image_URL and Park_Land
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
    COALESCE(a.Image_URL, 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?auto=format&fit=crop&w=800&q=80') AS Image_URL,
    COALESCE(a.Park_Land, 'Theme Park Realm') AS Park_Land,
    q.Slot_Start_Time,
    q.Slot_End_Time,
    q.Status,
    q.Created_At
FROM Virtual_Queue_Pass q
JOIN Attraction a ON q.Attraction_ID = a.Attraction_ID;
