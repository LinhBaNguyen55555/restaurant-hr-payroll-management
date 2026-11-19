-- Schema migration for F02 & F03
-- F02: Employee Profiles, Employment Contracts, Wage Histories, Work Restrictions, Import Jobs
-- F03: Shift Templates, Shift Schedules, Shift Swap Requests, Compensatory Rest Days, Notifications

CREATE TABLE IF NOT EXISTS work_restrictions (
    restriction_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT UNSIGNED NOT NULL,
    restriction_type VARCHAR(50) NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NULL,
    max_daily_minutes SMALLINT UNSIGNED NULL,
    max_weekly_minutes SMALLINT UNSIGNED NULL,
    allow_night_shift TINYINT(1) NOT NULL DEFAULT 0,
    allow_sunday TINYINT(1) NOT NULL DEFAULT 0,
    scheduling_rule_summary VARCHAR(255) NOT NULL,
    confidential_notes VARCHAR(500) NULL,
    created_at_utc DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_restr_employee FOREIGN KEY(employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
    INDEX idx_restr_emp_valid(employee_id, valid_from, valid_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS import_jobs (
    job_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    job_type VARCHAR(50) NOT NULL DEFAULT 'EMPLOYEES',
    total_rows INT NOT NULL DEFAULT 0,
    success_rows INT NOT NULL DEFAULT 0,
    error_rows INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    created_by_user_id BIGINT UNSIGNED NULL,
    summary_report TEXT NULL,
    created_at_utc DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS import_errors (
    error_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    job_id BIGINT UNSIGNED NOT NULL,
    line_number INT NOT NULL,
    field_name VARCHAR(100) NULL,
    error_message_vi VARCHAR(255) NOT NULL,
    error_message_de VARCHAR(255) NOT NULL,
    raw_value VARCHAR(255) NULL,
    CONSTRAINT fk_importerr_job FOREIGN KEY(job_id) REFERENCES import_jobs(job_id) ON DELETE CASCADE,
    INDEX idx_importerr_job(job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
