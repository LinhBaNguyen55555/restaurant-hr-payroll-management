-- Schema Migration for F06 & F07
-- F06: Leave & Absence Management (Leave Types, Balances, Requests, Sickness/EntgFG, Compensatory Rest ArbZG §11)
-- F07: Holiday, Allowance & SFN Tax Exemption (§3b EStG, SvEV, Work Time Segments, Stacking Rules)

DROP PROCEDURE IF EXISTS AddColumnUnlessExists;
DELIMITER $$
CREATE PROCEDURE AddColumnUnlessExists(
    IN tableName VARCHAR(64),
    IN colName VARCHAR(64),
    IN colDef VARCHAR(255)
)
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = tableName
        AND COLUMN_NAME = colName
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', tableName, '` ADD COLUMN `', colName, '` ', colDef);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$
DELIMITER ;

-- ========================================================
-- F06: LEAVE & ABSENCE
-- ========================================================

-- 1. Upgrade leave_types
CALL AddColumnUnlessExists('leave_types', 'name_vi', 'VARCHAR(120) NULL AFTER name_de');
CALL AddColumnUnlessExists('leave_types', 'description', 'VARCHAR(255) NULL AFTER name_vi');

UPDATE leave_types SET name_vi = 'Nghỉ phép năm (BUrlG)' WHERE leave_code = 'ANNUAL';
UPDATE leave_types SET name_vi = 'Nghỉ ốm (EntgFG)' WHERE leave_code = 'SICK';
UPDATE leave_types SET name_vi = 'Nghỉ bù (ArbZG §11)' WHERE leave_code = 'COMP_REST';
UPDATE leave_types SET name_vi = 'Nghỉ không lương' WHERE leave_code = 'UNPAID';
UPDATE leave_types SET name_vi = 'Nghỉ việc riêng (§616 BGB)' WHERE leave_code = 'OTHER';

-- 2. Upgrade leave_balances
CALL AddColumnUnlessExists('leave_balances', 'entitled_days', 'DECIMAL(5,2) NOT NULL DEFAULT 20.00');
CALL AddColumnUnlessExists('leave_balances', 'used_days', 'DECIMAL(5,2) NOT NULL DEFAULT 0.00');
CALL AddColumnUnlessExists('leave_balances', 'carried_days', 'DECIMAL(5,2) NOT NULL DEFAULT 0.00');
CALL AddColumnUnlessExists('leave_balances', 'remaining_days', 'DECIMAL(5,2) NOT NULL DEFAULT 20.00');
CALL AddColumnUnlessExists('leave_balances', 'expiry_date', 'DATE NULL');
CALL AddColumnUnlessExists('leave_balances', 'updated_at_utc', 'DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)');

-- 3. Upgrade leave_requests
CALL AddColumnUnlessExists('leave_requests', 'requested_days', 'DECIMAL(5,2) NOT NULL DEFAULT 1.00');
CALL AddColumnUnlessExists('leave_requests', 'review_notes', 'VARCHAR(500) NULL');
CALL AddColumnUnlessExists('leave_requests', 'reviewed_at_utc', 'DATETIME(6) NULL');
CALL AddColumnUnlessExists('leave_requests', 'created_at_utc', 'DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)');

-- 4. Upgrade absence_records (Sickness absences - DSGVO compliant)
CALL AddColumnUnlessExists('absence_records', 'has_medical_certificate', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL AddColumnUnlessExists('absence_records', 'certificate_date', 'DATE NULL');
CALL AddColumnUnlessExists('absence_records', 'is_continued_pay_eligible', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL AddColumnUnlessExists('absence_records', 'gross_pay_impact_percent', 'DECIMAL(5,2) NOT NULL DEFAULT 100.00');
CALL AddColumnUnlessExists('absence_records', 'notes', 'VARCHAR(500) NULL');
CALL AddColumnUnlessExists('absence_records', 'recorded_by_user_id', 'BIGINT UNSIGNED NULL');
CALL AddColumnUnlessExists('absence_records', 'created_at_utc', 'DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)');

-- 5. Upgrade compensatory_rest_days (ArbZG §11)
CALL AddColumnUnlessExists('compensatory_rest_days', 'deadline_date', 'DATE NULL');
CALL AddColumnUnlessExists('compensatory_rest_days', 'branch_id', 'BIGINT UNSIGNED NOT NULL DEFAULT 1');
CALL AddColumnUnlessExists('compensatory_rest_days', 'notes', 'VARCHAR(500) NULL');
CALL AddColumnUnlessExists('compensatory_rest_days', 'created_at_utc', 'DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)');

-- ========================================================
-- F07: HOLIDAYS, SEGMENTS & SFN ALLOWANCES
-- ========================================================

-- 6. Ensure statutory holidays for Baden-Württemberg (BW)
INSERT INTO public_holidays (state_code, holiday_date, holiday_code, holiday_name_de, is_statutory, verification_status)
VALUES 
    ('BW', '2026-01-01', 'NEUJAHR', 'Neujahr', 1, 'VERIFIED'),
    ('BW', '2026-01-06', 'DREIKOENIGE', 'Heilige Drei Könige', 1, 'VERIFIED'),
    ('BW', '2026-04-03', 'KARFREITAG', 'Karfreitag', 1, 'VERIFIED'),
    ('BW', '2026-04-06', 'OSTERMONTAG', 'Ostermontag', 1, 'VERIFIED'),
    ('BW', '2026-05-01', 'MAIFEIERTAG', 'Tag der Arbeit', 1, 'VERIFIED'),
    ('BW', '2026-05-14', 'HIMMELFAHRT', 'Christi Himmelfahrt', 1, 'VERIFIED'),
    ('BW', '2026-05-25', 'PFINGSTMONTAG', 'Pfingstmontag', 1, 'VERIFIED'),
    ('BW', '2026-06-04', 'FRONLEICHNAM', 'Fronleichnam', 1, 'VERIFIED'),
    ('BW', '2026-10-03', 'EINHEIT', 'Tag der Deutschen Einheit', 1, 'VERIFIED'),
    ('BW', '2026-11-01', 'ALLERHEILIGEN', 'Allerheiligen', 1, 'VERIFIED'),
    ('BW', '2026-12-25', 'WEIHNACHTEN_1', '1. Weihnachtsfeiertag', 1, 'VERIFIED'),
    ('BW', '2026-12-26', 'WEIHNACHTEN_2', '2. Weihnachtsfeiertag', 1, 'VERIFIED')
ON DUPLICATE KEY UPDATE holiday_name_de = VALUES(holiday_name_de);

-- 7. Upgrade work_time_segments
CALL AddColumnUnlessExists('work_time_segments', 'timesheet_id', 'BIGINT UNSIGNED NULL');
CALL AddColumnUnlessExists('work_time_segments', 'employee_id', 'BIGINT UNSIGNED NOT NULL DEFAULT 1');
CALL AddColumnUnlessExists('work_time_segments', 'is_deep_night', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL AddColumnUnlessExists('work_time_segments', 'is_holiday', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL AddColumnUnlessExists('work_time_segments', 'is_special_day', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL AddColumnUnlessExists('work_time_segments', 'segment_type', 'VARCHAR(50) NOT NULL DEFAULT \'REGULAR\'');
CALL AddColumnUnlessExists('work_time_segments', 'created_at_utc', 'DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)');

-- 8. Ensure Allowance Rates in allowance_rates
-- NIGHT (25%), DEEP_NIGHT (40%), SUNDAY (50%), HOLIDAY (100%), SPECIAL_HOLIDAY (125%/150%), CHRISTMAS_EVE (150%), NEW_YEAR_EVE (125%)
INSERT INTO allowance_rates (policy_id, allowance_code, payment_percent, stacking_group, stacking_behavior)
VALUES
    (1, 'DEEP_NIGHT', 40.000, 'NIGHT', 'ADD'),
    (1, 'CHRISTMAS_EVE', 150.000, 'DAY', 'MAX_OF_DAY'),
    (1, 'NEW_YEAR_EVE', 125.000, 'DAY', 'MAX_OF_DAY')
ON DUPLICATE KEY UPDATE payment_percent = VALUES(payment_percent);

-- 9. Upgrade allowance_calculations
CALL AddColumnUnlessExists('allowance_calculations', 'timesheet_id', 'BIGINT UNSIGNED NULL');
CALL AddColumnUnlessExists('allowance_calculations', 'employee_id', 'BIGINT UNSIGNED NOT NULL DEFAULT 1');
CALL AddColumnUnlessExists('allowance_calculations', 'allowance_code', 'VARCHAR(50) NOT NULL DEFAULT \'NIGHT\'');
CALL AddColumnUnlessExists('allowance_calculations', 'base_wage_eur', 'DECIMAL(10,2) NOT NULL DEFAULT 15.00');
CALL AddColumnUnlessExists('allowance_calculations', 'rate_percent', 'DECIMAL(7,3) NOT NULL DEFAULT 0.000');
CALL AddColumnUnlessExists('allowance_calculations', 'tax_exempt_percent', 'DECIMAL(7,3) NOT NULL DEFAULT 0.000');
CALL AddColumnUnlessExists('allowance_calculations', 'calculation_trace_json', 'JSON NULL');
CALL AddColumnUnlessExists('allowance_calculations', 'created_at_utc', 'DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)');

-- Seed initial leave balances for sample employees for year 2026
INSERT INTO leave_balances (employee_id, leave_type_id, leave_year, entitled_days, used_days, carried_days, remaining_days, approval_status)
SELECT e.employee_id, 1, 2026, 25.00, 3.00, 2.00, 24.00, 'APPROVED'
FROM employees e
WHERE NOT EXISTS (
    SELECT 1 FROM leave_balances lb 
    WHERE lb.employee_id = e.employee_id AND lb.leave_type_id = 1 AND lb.leave_year = 2026
);

DROP PROCEDURE IF EXISTS AddColumnUnlessExists;
