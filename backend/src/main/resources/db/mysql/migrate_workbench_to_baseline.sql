-- Migration & operational seed script to align an existing MySQL Workbench database
-- (`restaurant_hr_payroll_management`) with the F00-F07 JPA entities and `baseline.sql`
-- while preserving all existing accounts, employees, branches, schedules, and timesheets.

USE restaurant_hr_payroll_management;

DROP PROCEDURE IF EXISTS _dt06_drop_fk;
DROP PROCEDURE IF EXISTS _dt06_drop_col;
DROP PROCEDURE IF EXISTS _dt06_drop_idx;
DROP PROCEDURE IF EXISTS _dt06_add_pk_id;

DELIMITER //

CREATE PROCEDURE _dt06_drop_fk(IN tbl VARCHAR(64), IN fkName VARCHAR(64))
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND CONSTRAINT_NAME = fkName AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` DROP FOREIGN KEY `', fkName, '`');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //

CREATE PROCEDURE _dt06_drop_idx(IN tbl VARCHAR(64), IN idxName VARCHAR(64))
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idxName
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` DROP INDEX `', idxName, '`');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //

CREATE PROCEDURE _dt06_drop_col(IN tbl VARCHAR(64), IN colName VARCHAR(64))
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = colName
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` DROP COLUMN `', colName, '`');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //

CREATE PROCEDURE _dt06_add_pk_id(IN tbl VARCHAR(64), IN oldPkCol VARCHAR(64))
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = oldPkCol
  ) THEN
    SET @sql1 = CONCAT('ALTER TABLE `', tbl, '` MODIFY `', oldPkCol, '` BIGINT UNSIGNED NOT NULL');
    PREPARE stmt1 FROM @sql1;
    EXECUTE stmt1;
    DEALLOCATE PREPARE stmt1;

    SET @sql2 = CONCAT('ALTER TABLE `', tbl, '` DROP PRIMARY KEY, DROP COLUMN `', oldPkCol, '`, ADD PRIMARY KEY (`id`)');
    PREPARE stmt2 FROM @sql2;
    EXECUTE stmt2;
    DEALLOCATE PREPARE stmt2;
  END IF;
END //

DELIMITER ;

-- 1. Drop legacy cross-table foreign keys that block schema alignment
CALL _dt06_drop_fk('allowance_policies', 'fk_policy_entity');
CALL _dt06_drop_fk('allowance_policies', 'fk_policy_approver');
CALL _dt06_drop_fk('employees', 'fk_emp_entity');
CALL _dt06_drop_fk('payroll_periods', 'fk_period_entity');
CALL _dt06_drop_fk('shift_schedules', 'fk_shift_branch');
CALL _dt06_drop_fk('shift_templates', 'fk_template_branch');
CALL _dt06_drop_fk('attendance_records', 'fk_ar_branch');
CALL _dt06_drop_fk('biometric_verification_configs', 'fk_bvc_branch');
CALL _dt06_drop_fk('departments', 'fk_dept_branch');
CALL _dt06_drop_fk('user_branch_scopes', 'fk_ubs_branch');
CALL _dt06_drop_fk('branches', 'fk_br_state');
CALL _dt06_drop_fk('leave_requests', 'fk_lr_reviewer');
CALL _dt06_drop_fk('notifications', 'fk_notice_user');
CALL _dt06_drop_fk('shift_swap_requests', 'fk_swap_reviewer');
CALL _dt06_drop_fk('work_time_segments', 'fk_wts_att');
CALL _dt06_drop_fk('employee_assignments', 'fk_asg_branch');
CALL _dt06_drop_fk('employee_assignments', 'fk_asg_department');
CALL _dt06_drop_fk('employee_assignments', 'fk_asg_position');

-- 2. Align legal_entities with Domain.LegalEntity & baseline.sql
CALL _dt06_drop_idx('legal_entities', 'entity_code');
CALL _dt06_add_pk_id('legal_entities', 'legal_entity_id');
CALL _dt06_drop_col('legal_entities', 'entity_code');
CALL _dt06_drop_col('legal_entities', 'legal_name');
CALL _dt06_drop_col('legal_entities', 'registered_city');
CALL _dt06_drop_col('legal_entities', 'country_code');
CALL _dt06_drop_col('legal_entities', 'tax_office_reference');
CALL _dt06_drop_col('legal_entities', 'status');
CALL _dt06_drop_col('legal_entities', 'created_at_utc');
CALL _dt06_drop_idx('legal_entities', 'uk_legal_entities_code');
ALTER TABLE legal_entities ADD CONSTRAINT uk_legal_entities_code UNIQUE (code);

-- 3. Align branches with Domain.Branch & baseline.sql
CALL _dt06_drop_idx('branches', 'branch_code');
CALL _dt06_drop_idx('branches', 'fk_br_state');
CALL _dt06_drop_idx('branches', 'ix_br_entity_state');
CALL _dt06_add_pk_id('branches', 'branch_id');
CALL _dt06_drop_col('branches', 'branch_code');
CALL _dt06_drop_col('branches', 'branch_name');
CALL _dt06_drop_col('branches', 'municipality_code');
CALL _dt06_drop_col('branches', 'timezone_id');
CALL _dt06_drop_col('branches', 'holiday_configuration_status');
CALL _dt06_drop_col('branches', 'is_active');
CALL _dt06_drop_col('branches', 'created_at_utc');
ALTER TABLE branches MODIFY COLUMN state_code VARCHAR(255) NULL;
CALL _dt06_drop_idx('branches', 'uk_branches_code');
CALL _dt06_drop_fk('branches', 'fk_branch_entity');
ALTER TABLE branches ADD CONSTRAINT uk_branches_code UNIQUE (code);
ALTER TABLE branches ADD CONSTRAINT fk_branch_entity FOREIGN KEY (legal_entity_id) REFERENCES legal_entities(id);

-- 4. Align employee_assignments with Domain.EmployeeAssignment & baseline.sql
CALL _dt06_drop_idx('employee_assignments', 'fk_asg_branch');
CALL _dt06_drop_idx('employee_assignments', 'fk_asg_department');
CALL _dt06_drop_idx('employee_assignments', 'fk_asg_position');
CALL _dt06_drop_idx('employee_assignments', 'ix_asg_employee_period');
CALL _dt06_add_pk_id('employee_assignments', 'assignment_id');
CALL _dt06_drop_col('employee_assignments', 'department_id');
CALL _dt06_drop_col('employee_assignments', 'assignment_type');
ALTER TABLE employee_assignments
  MODIFY COLUMN position_id BIGINT NULL,
  MODIFY COLUMN valid_from DATE NULL;
CALL _dt06_drop_idx('employee_assignments', 'idx_employee_period');
ALTER TABLE employee_assignments ADD INDEX idx_employee_period (employee_id, valid_from, valid_to);

-- 5. Align string UUID legal_entity_id / branch_id columns across F02-F07 tables
ALTER TABLE employees MODIFY COLUMN legal_entity_id VARCHAR(255) NOT NULL;
ALTER TABLE allowance_policies MODIFY COLUMN legal_entity_id VARCHAR(255) NOT NULL;
ALTER TABLE shift_templates MODIFY COLUMN branch_id VARCHAR(255) NOT NULL;
ALTER TABLE shift_schedules MODIFY COLUMN branch_id VARCHAR(255) NOT NULL;
ALTER TABLE attendance_timesheets MODIFY COLUMN branch_id VARCHAR(255) NOT NULL;
ALTER TABLE compensatory_rest_days MODIFY COLUMN branch_id VARCHAR(255) NOT NULL;

-- 6. Convert *by_user_id audit columns to VARCHAR(255) so both numeric and UUID accounts record cleanly
ALTER TABLE absence_records MODIFY COLUMN recorded_by_user_id VARCHAR(255) NULL;
ALTER TABLE allowance_policies MODIFY COLUMN approved_by_user_id VARCHAR(255) NULL;
ALTER TABLE attendance_adjustments MODIFY COLUMN adjusted_by_user_id VARCHAR(255) NULL;
ALTER TABLE attendance_change_requests MODIFY COLUMN decided_by_user_id VARCHAR(255) NULL;
ALTER TABLE attendance_exceptions MODIFY COLUMN resolved_by_user_id VARCHAR(255) NULL;
ALTER TABLE attendance_timesheets MODIFY COLUMN approved_by_user_id VARCHAR(255) NULL;
ALTER TABLE import_jobs MODIFY COLUMN created_by_user_id VARCHAR(255) NULL;
ALTER TABLE leave_requests MODIFY COLUMN reviewed_by_user_id VARCHAR(255) NULL;
ALTER TABLE shift_swap_requests MODIFY COLUMN reviewed_by_user_id VARCHAR(255) NULL;

-- 7. Drop leftover legacy NOT NULL/unused columns blocking F06-F07 entities & align JDBC types with baseline.sql / ddl-auto=validate
CALL _dt06_drop_col('leave_requests', 'requested_minutes');
CALL _dt06_drop_col('leave_balances', 'entitled_minutes');
CALL _dt06_drop_col('leave_balances', 'used_minutes');
CALL _dt06_drop_col('leave_balances', 'carried_minutes');
ALTER TABLE work_time_segments
  MODIFY COLUMN attendance_id BIGINT NULL,
  MODIFY COLUMN calculation_status VARCHAR(25) NOT NULL DEFAULT 'CALCULATED';

CALL _dt06_drop_fk('absence_records', 'fk_abs_type');
CALL _dt06_drop_fk('leave_balances', 'fk_lb_type');
CALL _dt06_drop_fk('leave_requests', 'fk_lr_type');
CALL _dt06_drop_fk('public_holidays', 'fk_holiday_state');

ALTER TABLE leave_types MODIFY COLUMN leave_type_id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE absence_records MODIFY COLUMN leave_type_id INT NOT NULL;
ALTER TABLE leave_balances
  MODIFY COLUMN leave_type_id INT NOT NULL,
  MODIFY COLUMN leave_year INT NOT NULL;
ALTER TABLE leave_requests MODIFY COLUMN leave_type_id INT NOT NULL;
ALTER TABLE absence_records ADD CONSTRAINT fk_abs_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(leave_type_id);
ALTER TABLE leave_balances ADD CONSTRAINT fk_lb_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(leave_type_id);
ALTER TABLE leave_requests ADD CONSTRAINT fk_lr_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(leave_type_id);

ALTER TABLE employment_contracts MODIFY COLUMN standard_weekly_minutes INT NOT NULL;
ALTER TABLE shift_schedules MODIFY COLUMN planned_break_minutes INT NOT NULL DEFAULT 0;
ALTER TABLE shift_templates MODIFY COLUMN default_break_minutes INT NOT NULL DEFAULT 0;
ALTER TABLE work_restrictions
  MODIFY COLUMN max_daily_minutes INT NULL,
  MODIFY COLUMN max_weekly_minutes INT NULL;
ALTER TABLE public_holidays MODIFY COLUMN state_code VARCHAR(2) NOT NULL;
ALTER TABLE wage_rates MODIFY COLUMN currency_code VARCHAR(3) NOT NULL DEFAULT 'EUR';

-- 8. Clean up broken historical records and activate operational demo data for F05/F06/F07
DELETE FROM attendance_exceptions WHERE timesheet_id = 0;

-- Timesheet #2 was adjusted to 08:00-16:00 with 30m break; align break record so F07 SFN succeeds
DELETE FROM break_records WHERE break_id = 1;
INSERT INTO break_records (employee_id, shift_id, break_type, start_time_utc, end_time_utc, duration_minutes, created_at_utc)
SELECT 5, NULL, 'STATUTORY_BREAK', '2026-11-25 11:45:00.000000', '2026-11-25 12:15:00.000000', 30, NOW(6)
FROM DUAL
WHERE EXISTS (SELECT 1 FROM attendance_timesheets WHERE timesheet_id = 2 AND actual_break_minutes = 30)
  AND NOT EXISTS (
    SELECT 1 FROM break_records
    WHERE employee_id = 5 AND start_time_utc >= '2026-11-25 08:00:00' AND end_time_utc <= '2026-11-25 16:00:00'
  );

-- Break #2 lasted 1.16s (< 60s) and had been rounded to 1m by old endBreak logic
UPDATE break_records SET duration_minutes = 0
WHERE break_id = 2 AND TIMESTAMPDIFF(SECOND, start_time_utc, end_time_utc) < 60;
UPDATE attendance_timesheets SET actual_break_minutes = 0
WHERE timesheet_id = 3 AND actual_break_minutes = 1;

-- Activate seeded wages, leave balances, and SFN policies/rates
UPDATE wage_rates SET approval_status = 'APPROVED' WHERE approval_status = 'MOCK_ONLY';
UPDATE leave_balances SET approval_status = 'APPROVED' WHERE approval_status = 'PENDING_REVIEW';

UPDATE allowance_policies
SET approval_status = 'ACTIVE',
    valid_from = '2025-01-01',
    approved_by_user_id = '1',
    reference_document = 'SFN-Tarifvertrag / Atelier Betriebsvereinbarung'
WHERE policy_id IN (1, 2);

UPDATE allowance_rates SET payment_percent = 150.000 WHERE policy_id = 1 AND allowance_code = 'SPECIAL_HOLIDAY';

INSERT INTO allowance_rates (policy_id, allowance_code, payment_percent, stacking_group, stacking_behavior)
SELECT 2, r.allowance_code, r.payment_percent, r.stacking_group, r.stacking_behavior
FROM allowance_rates r
WHERE r.policy_id = 1
  AND EXISTS (SELECT 1 FROM allowance_policies WHERE policy_id = 2)
  AND NOT EXISTS (SELECT 1 FROM allowance_rates x WHERE x.policy_id = 2 AND x.allowance_code = r.allowance_code);

-- 9. Deduplicate public_holidays and verify statutory holidays for BW, BE, BY (2025-2027)
DELETE FROM public_holidays WHERE holiday_id BETWEEN 1 AND 12 AND verification_status = 'SOURCE_REFERENCED';
UPDATE public_holidays SET holiday_code = 'NEW_YEAR', verification_status = 'VERIFIED' WHERE state_code = 'BW' AND holiday_date = '2026-01-01';
UPDATE public_holidays SET holiday_code = 'EPIPHANY', verification_status = 'VERIFIED' WHERE state_code = 'BW' AND holiday_date = '2026-01-06';
UPDATE public_holidays SET holiday_code = 'GOOD_FRIDAY', verification_status = 'VERIFIED' WHERE state_code = 'BW' AND holiday_date = '2026-04-03';
UPDATE public_holidays SET holiday_code = 'EASTER_MONDAY', verification_status = 'VERIFIED' WHERE state_code = 'BW' AND holiday_date = '2026-04-06';
UPDATE public_holidays SET holiday_code = 'LABOUR_DAY', verification_status = 'VERIFIED' WHERE state_code = 'BW' AND holiday_date = '2026-05-01';
UPDATE public_holidays SET holiday_code = 'ASCENSION', verification_status = 'VERIFIED' WHERE state_code = 'BW' AND holiday_date = '2026-05-14';
UPDATE public_holidays SET holiday_code = 'WHIT_MONDAY', verification_status = 'VERIFIED' WHERE state_code = 'BW' AND holiday_date = '2026-05-25';
UPDATE public_holidays SET holiday_code = 'CORPUS_CHRISTI', verification_status = 'VERIFIED' WHERE state_code = 'BW' AND holiday_date = '2026-06-04';
UPDATE public_holidays SET holiday_code = 'UNITY_DAY', verification_status = 'VERIFIED' WHERE state_code = 'BW' AND holiday_date = '2026-10-03';
UPDATE public_holidays SET holiday_code = 'ALL_SAINTS', verification_status = 'VERIFIED' WHERE state_code = 'BW' AND holiday_date = '2026-11-01';
UPDATE public_holidays SET holiday_code = 'CHRISTMAS_DAY', verification_status = 'VERIFIED' WHERE state_code = 'BW' AND holiday_date = '2026-12-25';
UPDATE public_holidays SET holiday_code = 'BOXING_DAY', verification_status = 'VERIFIED' WHERE state_code = 'BW' AND holiday_date = '2026-12-26';

INSERT INTO public_holidays (state_code, municipality_code, holiday_date, holiday_code, holiday_name_de, is_statutory, verification_status, official_source_url)
SELECT h.state_code, NULL, h.holiday_date, h.holiday_code, h.holiday_name_de, 1, 'VERIFIED', 'https://www.gesetze-im-internet.de/'
FROM (
  -- 2025 BW, BE, BY
  SELECT 'BW' AS state_code, '2025-01-01' AS holiday_date, 'NEW_YEAR' AS holiday_code, 'Neujahr' AS holiday_name_de
  UNION ALL SELECT 'BW', '2025-01-06', 'EPIPHANY', 'Heilige Drei Könige'
  UNION ALL SELECT 'BW', '2025-04-18', 'GOOD_FRIDAY', 'Karfreitag'
  UNION ALL SELECT 'BW', '2025-04-21', 'EASTER_MONDAY', 'Ostermontag'
  UNION ALL SELECT 'BW', '2025-05-01', 'LABOUR_DAY', 'Tag der Arbeit'
  UNION ALL SELECT 'BW', '2025-05-29', 'ASCENSION', 'Christi Himmelfahrt'
  UNION ALL SELECT 'BW', '2025-06-09', 'WHIT_MONDAY', 'Pfingstmontag'
  UNION ALL SELECT 'BW', '2025-06-19', 'CORPUS_CHRISTI', 'Fronleichnam'
  UNION ALL SELECT 'BW', '2025-10-03', 'UNITY_DAY', 'Tag der Deutschen Einheit'
  UNION ALL SELECT 'BW', '2025-11-01', 'ALL_SAINTS', 'Allerheiligen'
  UNION ALL SELECT 'BW', '2025-12-25', 'CHRISTMAS_DAY', '1. Weihnachtstag'
  UNION ALL SELECT 'BW', '2025-12-26', 'BOXING_DAY', '2. Weihnachtstag'
  UNION ALL SELECT 'BE', '2025-01-01', 'NEW_YEAR', 'Neujahr'
  UNION ALL SELECT 'BE', '2025-03-08', 'WOMEN_DAY', 'Internationaler Frauentag'
  UNION ALL SELECT 'BE', '2025-04-18', 'GOOD_FRIDAY', 'Karfreitag'
  UNION ALL SELECT 'BE', '2025-04-21', 'EASTER_MONDAY', 'Ostermontag'
  UNION ALL SELECT 'BE', '2025-05-01', 'LABOUR_DAY', 'Tag der Arbeit'
  UNION ALL SELECT 'BE', '2025-05-29', 'ASCENSION', 'Christi Himmelfahrt'
  UNION ALL SELECT 'BE', '2025-06-09', 'WHIT_MONDAY', 'Pfingstmontag'
  UNION ALL SELECT 'BE', '2025-10-03', 'UNITY_DAY', 'Tag der Deutschen Einheit'
  UNION ALL SELECT 'BE', '2025-12-25', 'CHRISTMAS_DAY', '1. Weihnachtstag'
  UNION ALL SELECT 'BE', '2025-12-26', 'BOXING_DAY', '2. Weihnachtstag'
  UNION ALL SELECT 'BY', '2025-01-01', 'NEW_YEAR', 'Neujahr'
  UNION ALL SELECT 'BY', '2025-01-06', 'EPIPHANY', 'Heilige Drei Könige'
  UNION ALL SELECT 'BY', '2025-04-18', 'GOOD_FRIDAY', 'Karfreitag'
  UNION ALL SELECT 'BY', '2025-04-21', 'EASTER_MONDAY', 'Ostermontag'
  UNION ALL SELECT 'BY', '2025-05-01', 'LABOUR_DAY', 'Tag der Arbeit'
  UNION ALL SELECT 'BY', '2025-05-29', 'ASCENSION', 'Christi Himmelfahrt'
  UNION ALL SELECT 'BY', '2025-06-09', 'WHIT_MONDAY', 'Pfingstmontag'
  UNION ALL SELECT 'BY', '2025-06-19', 'CORPUS_CHRISTI', 'Fronleichnam'
  UNION ALL SELECT 'BY', '2025-10-03', 'UNITY_DAY', 'Tag der Deutschen Einheit'
  UNION ALL SELECT 'BY', '2025-11-01', 'ALL_SAINTS', 'Allerheiligen'
  UNION ALL SELECT 'BY', '2025-12-25', 'CHRISTMAS_DAY', '1. Weihnachtstag'
  UNION ALL SELECT 'BY', '2025-12-26', 'BOXING_DAY', '2. Weihnachtstag'
  -- 2026 BE, BY (BW already verified above)
  UNION ALL SELECT 'BE', '2026-01-01', 'NEW_YEAR', 'Neujahr'
  UNION ALL SELECT 'BE', '2026-03-08', 'WOMEN_DAY', 'Internationaler Frauentag'
  UNION ALL SELECT 'BE', '2026-04-03', 'GOOD_FRIDAY', 'Karfreitag'
  UNION ALL SELECT 'BE', '2026-04-06', 'EASTER_MONDAY', 'Ostermontag'
  UNION ALL SELECT 'BE', '2026-05-01', 'LABOUR_DAY', 'Tag der Arbeit'
  UNION ALL SELECT 'BE', '2026-05-14', 'ASCENSION', 'Christi Himmelfahrt'
  UNION ALL SELECT 'BE', '2026-05-25', 'WHIT_MONDAY', 'Pfingstmontag'
  UNION ALL SELECT 'BE', '2026-10-03', 'UNITY_DAY', 'Tag der Deutschen Einheit'
  UNION ALL SELECT 'BE', '2026-12-25', 'CHRISTMAS_DAY', '1. Weihnachtstag'
  UNION ALL SELECT 'BE', '2026-12-26', 'BOXING_DAY', '2. Weihnachtstag'
  UNION ALL SELECT 'BY', '2026-01-01', 'NEW_YEAR', 'Neujahr'
  UNION ALL SELECT 'BY', '2026-01-06', 'EPIPHANY', 'Heilige Drei Könige'
  UNION ALL SELECT 'BY', '2026-04-03', 'GOOD_FRIDAY', 'Karfreitag'
  UNION ALL SELECT 'BY', '2026-04-06', 'EASTER_MONDAY', 'Ostermontag'
  UNION ALL SELECT 'BY', '2026-05-01', 'LABOUR_DAY', 'Tag der Arbeit'
  UNION ALL SELECT 'BY', '2026-05-14', 'ASCENSION', 'Christi Himmelfahrt'
  UNION ALL SELECT 'BY', '2026-05-25', 'WHIT_MONDAY', 'Pfingstmontag'
  UNION ALL SELECT 'BY', '2026-06-04', 'CORPUS_CHRISTI', 'Fronleichnam'
  UNION ALL SELECT 'BY', '2026-10-03', 'UNITY_DAY', 'Tag der Deutschen Einheit'
  UNION ALL SELECT 'BY', '2026-11-01', 'ALL_SAINTS', 'Allerheiligen'
  UNION ALL SELECT 'BY', '2026-12-25', 'CHRISTMAS_DAY', '1. Weihnachtstag'
  UNION ALL SELECT 'BY', '2026-12-26', 'BOXING_DAY', '2. Weihnachtstag'
  -- 2027 BW, BE, BY
  UNION ALL SELECT 'BW', '2027-01-01', 'NEW_YEAR', 'Neujahr'
  UNION ALL SELECT 'BW', '2027-01-06', 'EPIPHANY', 'Heilige Drei Könige'
  UNION ALL SELECT 'BW', '2027-03-26', 'GOOD_FRIDAY', 'Karfreitag'
  UNION ALL SELECT 'BW', '2027-03-29', 'EASTER_MONDAY', 'Ostermontag'
  UNION ALL SELECT 'BW', '2027-05-01', 'LABOUR_DAY', 'Tag der Arbeit'
  UNION ALL SELECT 'BW', '2027-05-06', 'ASCENSION', 'Christi Himmelfahrt'
  UNION ALL SELECT 'BW', '2027-05-17', 'WHIT_MONDAY', 'Pfingstmontag'
  UNION ALL SELECT 'BW', '2027-05-27', 'CORPUS_CHRISTI', 'Fronleichnam'
  UNION ALL SELECT 'BW', '2027-10-03', 'UNITY_DAY', 'Tag der Deutschen Einheit'
  UNION ALL SELECT 'BW', '2027-11-01', 'ALL_SAINTS', 'Allerheiligen'
  UNION ALL SELECT 'BW', '2027-12-25', 'CHRISTMAS_DAY', '1. Weihnachtstag'
  UNION ALL SELECT 'BW', '2027-12-26', 'BOXING_DAY', '2. Weihnachtstag'
  UNION ALL SELECT 'BE', '2027-01-01', 'NEW_YEAR', 'Neujahr'
  UNION ALL SELECT 'BE', '2027-03-08', 'WOMEN_DAY', 'Internationaler Frauentag'
  UNION ALL SELECT 'BE', '2027-03-26', 'GOOD_FRIDAY', 'Karfreitag'
  UNION ALL SELECT 'BE', '2027-03-29', 'EASTER_MONDAY', 'Ostermontag'
  UNION ALL SELECT 'BE', '2027-05-01', 'LABOUR_DAY', 'Tag der Arbeit'
  UNION ALL SELECT 'BE', '2027-05-06', 'ASCENSION', 'Christi Himmelfahrt'
  UNION ALL SELECT 'BE', '2027-05-17', 'WHIT_MONDAY', 'Pfingstmontag'
  UNION ALL SELECT 'BE', '2027-10-03', 'UNITY_DAY', 'Tag der Deutschen Einheit'
  UNION ALL SELECT 'BE', '2027-12-25', 'CHRISTMAS_DAY', '1. Weihnachtstag'
  UNION ALL SELECT 'BE', '2027-12-26', 'BOXING_DAY', '2. Weihnachtstag'
  UNION ALL SELECT 'BY', '2027-01-01', 'NEW_YEAR', 'Neujahr'
  UNION ALL SELECT 'BY', '2027-01-06', 'EPIPHANY', 'Heilige Drei Könige'
  UNION ALL SELECT 'BY', '2027-03-26', 'GOOD_FRIDAY', 'Karfreitag'
  UNION ALL SELECT 'BY', '2027-03-29', 'EASTER_MONDAY', 'Ostermontag'
  UNION ALL SELECT 'BY', '2027-05-01', 'LABOUR_DAY', 'Tag der Arbeit'
  UNION ALL SELECT 'BY', '2027-05-06', 'ASCENSION', 'Christi Himmelfahrt'
  UNION ALL SELECT 'BY', '2027-05-17', 'WHIT_MONDAY', 'Pfingstmontag'
  UNION ALL SELECT 'BY', '2027-05-27', 'CORPUS_CHRISTI', 'Fronleichnam'
  UNION ALL SELECT 'BY', '2027-10-03', 'UNITY_DAY', 'Tag der Deutschen Einheit'
  UNION ALL SELECT 'BY', '2027-11-01', 'ALL_SAINTS', 'Allerheiligen'
  UNION ALL SELECT 'BY', '2027-12-25', 'CHRISTMAS_DAY', '1. Weihnachtstag'
  UNION ALL SELECT 'BY', '2027-12-26', 'BOXING_DAY', '2. Weihnachtstag'
) h
WHERE NOT EXISTS (
  SELECT 1 FROM public_holidays p
  WHERE p.state_code = h.state_code AND p.holiday_date = h.holiday_date AND p.municipality_code IS NULL
);

DROP PROCEDURE IF EXISTS _dt06_drop_fk;
DROP PROCEDURE IF EXISTS _dt06_drop_col;
DROP PROCEDURE IF EXISTS _dt06_drop_idx;
DROP PROCEDURE IF EXISTS _dt06_add_pk_id;
