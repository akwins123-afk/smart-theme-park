-- ====================================================================
-- MIGRATION 003: Customer-Safe & Operational Views
-- Enables visitors to securely view pass details and live wait loads
-- ====================================================================

USE smart_theme_park;

-- Safe view for visitor pass details with human-readable attraction names
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
    q.Slot_Start_Time,
    q.Slot_End_Time,
    q.Status,
    q.Created_At
FROM Virtual_Queue_Pass q
JOIN Attraction a ON q.Attraction_ID = a.Attraction_ID;

-- Operational view for attraction load and estimated wait times
CREATE OR REPLACE VIEW Vw_Attraction_Live_Load AS
SELECT 
    a.Attraction_ID,
    a.Attraction_Name,
    a.Category,
    a.Min_Height_cm,
    a.Max_Height_cm,
    a.Capacity_Per_Slot,
    a.Thrill_Level,
    COUNT(CASE WHEN q.Status = 'Booked' THEN 1 END) AS Active_Booked_Passes,
    -- Formula: (Active Passes / Capacity) * 15 min estimated wait base
    ROUND(LEAST(120, (COUNT(CASE WHEN q.Status = 'Booked' THEN 1 END) / GREATEST(1, a.Capacity_Per_Slot)) * 30 + 5)) AS Estimated_Wait_Min,
    CASE 
        WHEN COUNT(CASE WHEN q.Status = 'Booked' THEN 1 END) >= a.Capacity_Per_Slot THEN 'Capacity Full'
        WHEN COUNT(CASE WHEN q.Status = 'Booked' THEN 1 END) >= (a.Capacity_Per_Slot * 0.7) THEN 'High'
        WHEN COUNT(CASE WHEN q.Status = 'Booked' THEN 1 END) >= (a.Capacity_Per_Slot * 0.3) THEN 'Moderate'
        ELSE 'Low'
    END AS Congestion_Status
FROM Attraction a
LEFT JOIN Virtual_Queue_Pass q ON a.Attraction_ID = q.Attraction_ID
GROUP BY a.Attraction_ID, a.Attraction_Name, a.Category, a.Min_Height_cm, a.Max_Height_cm, a.Capacity_Per_Slot, a.Thrill_Level;
