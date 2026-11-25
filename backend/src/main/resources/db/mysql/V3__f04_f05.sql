-- Schema migration for F04 & F05
-- F04: Attendance Management (Raw events, Breaks, Timesheets, Exceptions, Manual entry)
-- F05: Reconciliation & Approval (Shift vs Actual, Change Requests, SoD Approvals, Period Locks)

CREATE TABLE IF NOT EXISTS attendance_events (
    event_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT UNSIGNED NOT NULL,
    shift_id BIGINT UNSIGNED NULL,
    event_type VARCHAR(30) NOT NULL, -- CHECK_IN, CHECK_OUT
    event_time_utc DATETIME(6) NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'WEB_PORTAL', -- WEB_PORTAL, KIOSK, MOBILE, MANUAL
    ip_address VARCHAR(45) NULL,
    device_info VARCHAR(255) NULL,
    is_offline_sync TINYINT(1) NOT NULL DEFAULT 0,
    notes VARCHAR(500) NULL,
    created_at_utc DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_att_emp_time(employee_id, event_time_utc),
    INDEX idx_att_shift(shift_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS break_records (
    break_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT UNSIGNED NOT NULL,
    shift_id BIGINT UNSIGNED NULL,
    break_type VARCHAR(50) NOT NULL DEFAULT 'STATUTORY_BREAK', -- STATUTORY_BREAK, LUNCH_BREAK, REST_BREAK
    start_time_utc DATETIME(6) NOT NULL,
    end_time_utc DATETIME(6) NULL,
    duration_minutes INT NOT NULL DEFAULT 0,
    created_at_utc DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_break_emp(employee_id, start_time_utc),
    INDEX idx_break_shift(shift_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance_timesheets (
    timesheet_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT UNSIGNED NOT NULL,
    branch_id BIGINT UNSIGNED NOT NULL,
    shift_id BIGINT UNSIGNED NULL,
    work_date DATE NOT NULL,
    planned_start_utc DATETIME(6) NULL,
    planned_end_utc DATETIME(6) NULL,
    planned_break_minutes INT NOT NULL DEFAULT 0,
    actual_start_utc DATETIME(6) NULL,
    actual_end_utc DATETIME(6) NULL,
    actual_break_minutes INT NOT NULL DEFAULT 0,
    worked_minutes INT NOT NULL DEFAULT 0,
    late_minutes INT NOT NULL DEFAULT 0,
    early_departure_minutes INT NOT NULL DEFAULT 0,
    overtime_minutes INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN', -- OPEN, PENDING_APPROVAL, APPROVED, REJECTED, LOCKED
    has_exception TINYINT(1) NOT NULL DEFAULT 0,
    approved_by_user_id BIGINT UNSIGNED NULL,
    approved_at_utc DATETIME(6) NULL,
    is_locked TINYINT(1) NOT NULL DEFAULT 0,
    recalculation_required TINYINT(1) NOT NULL DEFAULT 0,
    created_at_utc DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at_utc DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_ts_emp_date(employee_id, work_date),
    INDEX idx_ts_branch_date(branch_id, work_date),
    INDEX idx_ts_status(status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance_exceptions (
    exception_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    timesheet_id BIGINT UNSIGNED NOT NULL,
    employee_id BIGINT UNSIGNED NOT NULL,
    exception_type VARCHAR(50) NOT NULL, -- MISSING_CHECK_OUT, UNSCHEDULED_WORK, LATE_ARRIVAL, EARLY_DEPARTURE, INSUFFICIENT_BREAK, EXCESSIVE_WORK_HOURS
    severity VARCHAR(20) NOT NULL DEFAULT 'WARNING', -- INFO, WARNING, CRITICAL
    description_vi VARCHAR(255) NOT NULL,
    description_de VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN', -- OPEN, RESOLVED, DISMISSED
    resolution_notes VARCHAR(500) NULL,
    resolved_by_user_id BIGINT UNSIGNED NULL,
    resolved_at_utc DATETIME(6) NULL,
    created_at_utc DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_exc_ts(timesheet_id),
    INDEX idx_exc_status(status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance_change_requests (
    request_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    timesheet_id BIGINT UNSIGNED NOT NULL,
    employee_id BIGINT UNSIGNED NOT NULL,
    requested_start_utc DATETIME(6) NULL,
    requested_end_utc DATETIME(6) NULL,
    requested_break_minutes INT NULL,
    reason VARCHAR(500) NOT NULL,
    evidence_url VARCHAR(255) NULL,
    delta_minutes INT NOT NULL DEFAULT 0,
    requires_hr_escalation TINYINT(1) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, HR_ESCALATED, APPROVED, REJECTED
    decision_notes VARCHAR(500) NULL,
    decided_by_user_id BIGINT UNSIGNED NULL,
    decided_at_utc DATETIME(6) NULL,
    created_at_utc DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_acr_ts(timesheet_id),
    INDEX idx_acr_status(status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance_adjustments (
    adjustment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    timesheet_id BIGINT UNSIGNED NOT NULL,
    change_request_id BIGINT UNSIGNED NULL,
    adjusted_by_user_id BIGINT UNSIGNED NOT NULL,
    adjusted_at_utc DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    old_start_utc DATETIME(6) NULL,
    new_start_utc DATETIME(6) NULL,
    old_end_utc DATETIME(6) NULL,
    new_end_utc DATETIME(6) NULL,
    old_break_minutes INT NULL,
    new_break_minutes INT NULL,
    reason VARCHAR(500) NOT NULL,
    INDEX idx_adj_ts(timesheet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
