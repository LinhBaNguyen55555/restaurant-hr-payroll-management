-- DT06 baseline for an empty MySQL 8 database.
-- The organization schema preserves the V1 constraints. Operational tables follow the JPA model.
-- Apply this file by itself. V1-V4 are historical scripts for legacy installations.

CREATE TABLE legal_entities (
 id VARCHAR(255) PRIMARY KEY, version BIGINT NOT NULL, created_at DATETIME(6),
 code VARCHAR(255) NOT NULL UNIQUE, name VARCHAR(255), registration_number VARCHAR(255), address VARCHAR(255), active BIT NOT NULL
) engine=InnoDB;
CREATE TABLE user_accounts (
 id VARCHAR(255) PRIMARY KEY, version BIGINT NOT NULL, created_at DATETIME(6),
 email VARCHAR(255) NOT NULL UNIQUE, name VARCHAR(255) NOT NULL, password_hash VARCHAR(255) NOT NULL,
 roles VARCHAR(255), legal_entity_ids VARCHAR(4000), branch_ids VARCHAR(4000), active BIT NOT NULL,
 mfa_enabled BIT NOT NULL, mfa_secret VARCHAR(1024), last_totp_step BIGINT NOT NULL,
 auth_version INT NOT NULL, failures INT NOT NULL, locked_until DATETIME(6), last_login DATETIME(6)
) engine=InnoDB;
CREATE TABLE branches (
 id VARCHAR(255) PRIMARY KEY, version BIGINT NOT NULL, created_at DATETIME(6), code VARCHAR(255) NOT NULL UNIQUE,
 name VARCHAR(255), legal_entity_id VARCHAR(255), city VARCHAR(255), address VARCHAR(255), state_code VARCHAR(255),
 timezone VARCHAR(255), active BIT NOT NULL, accent VARCHAR(255),
 CONSTRAINT fk_branch_entity FOREIGN KEY(legal_entity_id) REFERENCES legal_entities(id)
) engine=InnoDB;
CREATE TABLE work_locations (
 id VARCHAR(255) PRIMARY KEY, version BIGINT NOT NULL, created_at DATETIME(6), branch_id VARCHAR(255), name VARCHAR(255),
 address VARCHAR(255), state_code VARCHAR(255), timezone VARCHAR(255), active BIT NOT NULL,
 CONSTRAINT fk_location_branch FOREIGN KEY(branch_id) REFERENCES branches(id)
) engine=InnoDB;
CREATE TABLE employee_refs (
 id VARCHAR(255) PRIMARY KEY, version BIGINT NOT NULL, created_at DATETIME(6), name VARCHAR(255), position VARCHAR(255), home_branch_id VARCHAR(255),
 CONSTRAINT fk_employee_home FOREIGN KEY(home_branch_id) REFERENCES branches(id)
) engine=InnoDB;
CREATE TABLE employee_assignments (
 id VARCHAR(255) PRIMARY KEY, version BIGINT NOT NULL, created_at DATETIME(6), employee_id VARCHAR(255), branch_id VARCHAR(255),
 work_location_id VARCHAR(255), valid_from DATE, valid_to DATE, kind VARCHAR(255), reason VARCHAR(500),
 state_code VARCHAR(255), timezone VARCHAR(255), address_snapshot VARCHAR(255),
 CONSTRAINT fk_assignment_employee FOREIGN KEY(employee_id) REFERENCES employee_refs(id),
 CONSTRAINT fk_assignment_branch FOREIGN KEY(branch_id) REFERENCES branches(id),
 CONSTRAINT fk_assignment_location FOREIGN KEY(work_location_id) REFERENCES work_locations(id),
 INDEX idx_employee_period(employee_id,valid_from,valid_to)
) engine=InnoDB;
CREATE TABLE manager_assignments (
 id VARCHAR(255) PRIMARY KEY, version BIGINT NOT NULL, created_at DATETIME(6), manager_id VARCHAR(255), branch_id VARCHAR(255), valid_from DATE, valid_to DATE,
 CONSTRAINT fk_manager_user FOREIGN KEY(manager_id) REFERENCES user_accounts(id),
 CONSTRAINT fk_manager_branch FOREIGN KEY(branch_id) REFERENCES branches(id),
 INDEX idx_manager_period(branch_id,valid_from,valid_to)
) engine=InnoDB;
CREATE TABLE audit_events (
 id VARCHAR(255) PRIMARY KEY, version BIGINT NOT NULL, created_at DATETIME(6), actor_id VARCHAR(255), actor_name VARCHAR(255),
 action VARCHAR(255), target VARCHAR(255), branch_id VARCHAR(255), detail VARCHAR(4000), INDEX idx_audit_time(created_at)
) engine=InnoDB;
CREATE TABLE account_resets (
 id VARCHAR(255) PRIMARY KEY, version BIGINT NOT NULL, created_at DATETIME(6), token_hash VARCHAR(255) UNIQUE, user_id VARCHAR(255), expires_at DATETIME(6), used BIT NOT NULL,
 CONSTRAINT fk_reset_user FOREIGN KEY(user_id) REFERENCES user_accounts(id)
) engine=InnoDB;
CREATE TABLE account_sessions (
 id VARCHAR(255) PRIMARY KEY, version BIGINT NOT NULL, created_at DATETIME(6), user_id VARCHAR(255), session_hash VARCHAR(255),
 agent VARCHAR(255), revoked BIT NOT NULL, expires_at DATETIME(6),
 CONSTRAINT fk_session_user FOREIGN KEY(user_id) REFERENCES user_accounts(id), INDEX idx_session_user(user_id)
) engine=InnoDB;

ALTER TABLE employee_assignments ADD COLUMN position_id BIGINT NULL;

create table absence_records (
    absence_id bigint not null auto_increment,
    certificate_date date,
    confidential_document_ref varchar(120),
    created_at_utc datetime(6) not null,
    employee_id bigint not null,
    end_date date not null,
    gross_pay_impact_percent decimal(5,2) not null,
    has_medical_certificate bit not null,
    is_continued_pay_eligible bit not null,
    leave_type_id integer not null,
    notes varchar(500),
    recorded_by_user_id varchar(255),
    start_date date not null,
    verification_status varchar(25) not null,
    primary key (absence_id)
) engine=InnoDB;

create table allowance_calculations (
    calculation_id bigint not null auto_increment,
    allowance_code varchar(50) not null,
    allowance_rate_id bigint not null,
    base_wage_eur decimal(10,2) not null,
    calculation_status varchar(30) not null,
    calculation_trace_json json,
    created_at_utc datetime(6) not null,
    employee_id bigint not null,
    paid_amount_eur decimal(14,2) not null,
    rate_percent decimal(7,3) not null,
    segment_id bigint not null,
    social_insurance_exempt_amount_eur decimal(14,2),
    tax_exempt_amount_eur decimal(14,2),
    tax_exempt_percent decimal(7,3) not null,
    tax_rule_id bigint,
    taxable_amount_eur decimal(14,2),
    timesheet_id bigint,
    wage_rate_id bigint not null,
    primary key (calculation_id)
) engine=InnoDB;

create table allowance_policies (
    policy_id bigint not null auto_increment,
    approval_status varchar(25) not null,
    approved_by_user_id varchar(255),
    legal_entity_id varchar(255) not null,
    policy_code varchar(40) not null,
    reference_document varchar(180),
    valid_from date not null,
    valid_to date,
    primary key (policy_id)
) engine=InnoDB;

create table allowance_rates (
    allowance_rate_id bigint not null auto_increment,
    allowance_code varchar(50) not null,
    conditions_json json,
    payment_percent decimal(7,3) not null,
    policy_id bigint not null,
    stacking_behavior varchar(30) not null,
    stacking_group varchar(40) not null,
    primary key (allowance_rate_id)
) engine=InnoDB;

create table attendance_adjustments (
    adjustment_id bigint not null auto_increment,
    adjusted_at_utc datetime(6) not null,
    adjusted_by_user_id varchar(255),
    change_request_id bigint,
    new_break_minutes integer,
    new_end_utc datetime(6),
    new_start_utc datetime(6),
    old_break_minutes integer,
    old_end_utc datetime(6),
    old_start_utc datetime(6),
    reason varchar(500) not null,
    timesheet_id bigint not null,
    primary key (adjustment_id)
) engine=InnoDB;

create table attendance_change_requests (
    request_id bigint not null auto_increment,
    created_at_utc datetime(6) not null,
    decided_at_utc datetime(6),
    decided_by_user_id varchar(255),
    decision_notes varchar(500),
    delta_minutes integer not null,
    employee_id bigint not null,
    evidence_url varchar(255),
    reason varchar(500) not null,
    requested_break_minutes integer,
    requested_end_utc datetime(6),
    requested_start_utc datetime(6),
    requires_hr_escalation bit not null,
    status varchar(30) not null,
    timesheet_id bigint not null,
    primary key (request_id)
) engine=InnoDB;

create table attendance_events (
    event_id bigint not null auto_increment,
    created_at_utc datetime(6) not null,
    device_info varchar(255),
    employee_id bigint not null,
    event_time_utc datetime(6) not null,
    event_type varchar(30) not null,
    ip_address varchar(45),
    is_offline_sync bit not null,
    notes varchar(500),
    shift_id bigint,
    source varchar(50) not null,
    primary key (event_id)
) engine=InnoDB;

create table attendance_exceptions (
    exception_id bigint not null auto_increment,
    created_at_utc datetime(6) not null,
    description_de varchar(255) not null,
    description_vi varchar(255) not null,
    employee_id bigint not null,
    exception_type varchar(50) not null,
    resolution_notes varchar(500),
    resolved_at_utc datetime(6),
    resolved_by_user_id varchar(255),
    severity varchar(20) not null,
    status varchar(30) not null,
    timesheet_id bigint not null,
    primary key (exception_id)
) engine=InnoDB;

create table attendance_timesheets (
    timesheet_id bigint not null auto_increment,
    actual_break_minutes integer not null,
    actual_end_utc datetime(6),
    actual_start_utc datetime(6),
    approved_at_utc datetime(6),
    approved_by_user_id varchar(255),
    branch_id varchar(255) not null,
    created_at_utc datetime(6) not null,
    early_departure_minutes integer not null,
    employee_id bigint not null,
    has_exception bit not null,
    is_locked bit not null,
    late_minutes integer not null,
    overtime_minutes integer not null,
    planned_break_minutes integer not null,
    planned_end_utc datetime(6),
    planned_start_utc datetime(6),
    recalculation_required bit not null,
    shift_id bigint,
    status varchar(30) not null,
    updated_at_utc datetime(6) not null,
    work_date date not null,
    worked_minutes integer not null,
    primary key (timesheet_id)
) engine=InnoDB;

create table break_records (
    break_id bigint not null auto_increment,
    break_type varchar(50) not null,
    created_at_utc datetime(6) not null,
    duration_minutes integer not null,
    employee_id bigint not null,
    end_time_utc datetime(6),
    shift_id bigint,
    start_time_utc datetime(6) not null,
    primary key (break_id)
) engine=InnoDB;

create table compensatory_rest_days (
    rest_id bigint not null auto_increment,
    branch_id varchar(255) not null,
    created_at_utc datetime(6) not null,
    deadline_date date,
    employee_id bigint not null,
    notes varchar(500),
    policy_reference varchar(180),
    related_work_date date not null,
    rest_date date,
    rest_kind varchar(30) not null,
    status varchar(30) not null,
    primary key (rest_id)
) engine=InnoDB;

create table employees (
    employee_id bigint not null auto_increment,
    created_at_utc datetime(6),
    date_of_birth date,
    display_name varchar(180) not null,
    email varchar(180),
    employee_code varchar(30) not null,
    employment_status varchar(25) not null,
    first_name varchar(100) not null,
    hire_date date not null,
    last_name varchar(100) not null,
    legal_entity_id varchar(255) not null,
    termination_date date,
    primary key (employee_id)
) engine=InnoDB;

create table employment_contracts (
    contract_id bigint not null auto_increment,
    collective_agreement_reference varchar(160),
    contract_number varchar(60) not null,
    contract_type varchar(40) not null,
    employee_id bigint not null,
    end_date date,
    pay_type varchar(25) not null,
    standard_weekly_minutes integer not null,
    start_date date not null,
    status varchar(25) not null,
    primary key (contract_id)
) engine=InnoDB;

create table import_errors (
    error_id bigint not null auto_increment,
    error_message_de varchar(255) not null,
    error_message_vi varchar(255) not null,
    field_name varchar(100),
    job_id bigint not null,
    line_number integer not null,
    raw_value varchar(255),
    primary key (error_id)
) engine=InnoDB;

create table import_jobs (
    job_id bigint not null auto_increment,
    created_at_utc datetime(6),
    created_by_user_id varchar(255),
    error_rows integer not null,
    file_name varchar(255) not null,
    job_type varchar(50) not null,
    status varchar(30) not null,
    success_rows integer not null,
    summary_report TEXT,
    total_rows integer not null,
    primary key (job_id)
) engine=InnoDB;

create table leave_balances (
    balance_id bigint not null auto_increment,
    approval_status varchar(25) not null,
    carried_days decimal(5,2) not null,
    employee_id bigint not null,
    entitled_days decimal(5,2) not null,
    expiry_date date,
    leave_type_id integer not null,
    leave_year integer not null,
    remaining_days decimal(5,2) not null,
    updated_at_utc datetime(6) not null,
    used_days decimal(5,2) not null,
    primary key (balance_id)
) engine=InnoDB;

create table leave_requests (
    leave_request_id bigint not null auto_increment,
    created_at_utc datetime(6) not null,
    employee_id bigint not null,
    end_date date not null,
    leave_type_id integer not null,
    reason varchar(600),
    requested_days decimal(5,2) not null,
    review_notes varchar(500),
    reviewed_at_utc datetime(6),
    reviewed_by_user_id varchar(255),
    start_date date not null,
    status varchar(25) not null,
    primary key (leave_request_id)
) engine=InnoDB;

create table leave_types (
    leave_type_id integer not null auto_increment,
    counts_against_annual_leave bit not null,
    description varchar(255),
    leave_code varchar(40) not null,
    name_de varchar(120) not null,
    name_vi varchar(120),
    pay_treatment varchar(30) not null,
    primary key (leave_type_id)
) engine=InnoDB;

create table notifications (
    notification_id bigint not null auto_increment,
    created_at_utc datetime(6),
    message varchar(500) not null,
    notification_type varchar(50) not null,
    recipient_user_id bigint not null,
    status varchar(20) not null,
    title varchar(180) not null,
    primary key (notification_id)
) engine=InnoDB;

create table positions (
    position_id bigint not null auto_increment,
    is_active bit not null,
    position_code varchar(40) not null,
    position_name_de varchar(120) not null,
    position_name_en varchar(120) not null,
    primary key (position_id)
) engine=InnoDB;

create table public_holidays (
    holiday_id bigint not null auto_increment,
    holiday_code varchar(60) not null,
    holiday_date date not null,
    holiday_name_de varchar(160) not null,
    is_statutory bit not null,
    municipality_code varchar(40),
    official_source_url varchar(500),
    state_code varchar(2) not null,
    verification_status varchar(25) not null,
    primary key (holiday_id)
) engine=InnoDB;

create table shift_schedules (
    shift_id bigint not null auto_increment,
    branch_id varchar(255) not null,
    employee_id bigint not null,
    planned_break_minutes integer not null,
    planned_end_utc datetime(6) not null,
    planned_start_utc datetime(6) not null,
    published_at_utc datetime(6),
    status varchar(25) not null,
    template_id bigint,
    version_number integer not null,
    primary key (shift_id)
) engine=InnoDB;

create table shift_swap_requests (
    swap_request_id bigint not null auto_increment,
    created_at_utc datetime(6),
    reason varchar(500),
    requested_by_employee_id bigint not null,
    reviewed_by_user_id varchar(255),
    source_shift_id bigint not null,
    status varchar(25) not null,
    target_employee_id bigint not null,
    primary key (swap_request_id)
) engine=InnoDB;

create table shift_templates (
    template_id bigint not null auto_increment,
    branch_id varchar(255) not null,
    default_break_minutes integer not null,
    ends_next_day bit not null,
    local_end_time time(0) not null,
    local_start_time time(0) not null,
    template_code varchar(40) not null,
    template_name varchar(100) not null,
    primary key (template_id)
) engine=InnoDB;

create table wage_rates (
    wage_rate_id bigint not null auto_increment,
    approval_status varchar(30) not null,
    contract_id bigint not null,
    currency_code varchar(3) not null,
    gross_hourly_eur decimal(12,4),
    gross_monthly_eur decimal(14,2),
    sfn_approved_hourly_base_eur decimal(12,4),
    valid_from date not null,
    valid_to date,
    primary key (wage_rate_id)
) engine=InnoDB;

create table work_restrictions (
    restriction_id bigint not null auto_increment,
    allow_night_shift bit not null,
    allow_sunday bit not null,
    confidential_notes varchar(500),
    created_at_utc datetime(6),
    employee_id bigint not null,
    max_daily_minutes integer,
    max_weekly_minutes integer,
    restriction_type varchar(50) not null,
    scheduling_rule_summary varchar(255) not null,
    valid_from date not null,
    valid_to date,
    primary key (restriction_id)
) engine=InnoDB;

create table work_time_segments (
    segment_id bigint not null auto_increment,
    attendance_id bigint,
    calculation_status varchar(25) not null,
    classification_version varchar(30) not null,
    created_at_utc datetime(6) not null,
    employee_id bigint not null,
    holiday_id bigint,
    is_deep_night bit not null,
    is_holiday bit not null,
    is_night bit not null,
    is_special_day bit not null,
    is_sunday bit not null,
    payable_minutes integer not null,
    segment_end_utc datetime(6) not null,
    segment_start_utc datetime(6) not null,
    segment_type varchar(50) not null,
    timesheet_id bigint,
    primary key (segment_id)
) engine=InnoDB;

alter table employees 
   add constraint UKj9xgmd0ya5jmus09o0b8pqrpb unique (email);

alter table employees 
   add constraint UKetqhw9qqnad1kyjq3ks1glw8x unique (employee_code);

alter table employment_contracts 
   add constraint UKrug2gs7e8lhon5wh61bera4ar unique (contract_number);

alter table leave_balances 
   add constraint UKc6wxe5vriqcd5j35897rty0cj unique (employee_id, leave_type_id, leave_year);

alter table leave_types 
   add constraint UKq0ctqwbh97e8xuapc305om0s2 unique (leave_code);

alter table positions 
   add constraint UK157cqj7049g15mma1tpx32l39 unique (position_code);

CREATE INDEX idx_schedule_branch_period ON shift_schedules (branch_id, planned_start_utc, planned_end_utc);
CREATE INDEX idx_schedule_employee_period ON shift_schedules (employee_id, planned_start_utc, planned_end_utc);
CREATE INDEX idx_timesheet_branch_date ON attendance_timesheets (branch_id, work_date);
CREATE INDEX idx_timesheet_employee_date ON attendance_timesheets (employee_id, work_date);
CREATE INDEX idx_break_employee_start ON break_records (employee_id, start_time_utc);
CREATE INDEX idx_holiday_state_date ON public_holidays (state_code, holiday_date);
CREATE INDEX idx_allowance_timesheet ON allowance_calculations (timesheet_id);
CREATE INDEX idx_segment_timesheet ON work_time_segments (timesheet_id);

INSERT INTO positions (position_code, position_name_de, position_name_en, is_active) VALUES
  ('SERVICE', 'Service', 'Service', TRUE),
  ('KITCHEN', 'Küche', 'Kitchen', TRUE),
  ('LEAD', 'Serviceleitung', 'Service lead', TRUE),
  ('BAR', 'Bar', 'Bar', TRUE);

INSERT INTO leave_types (leave_code, name_de, name_vi, pay_treatment, counts_against_annual_leave) VALUES
  ('ANNUAL', 'Urlaub', 'Nghỉ phép năm', 'PAID', TRUE),
  ('SICK', 'Krankheit', 'Nghỉ ốm', 'REVIEW_REQUIRED', FALSE),
  ('CHILD_SICK', 'Kind krank', 'Nghỉ chăm con ốm', 'REVIEW_REQUIRED', FALSE),
  ('COMP_REST', 'Ersatzruhetag', 'Nghỉ bù', 'PAID', FALSE),
  ('UNPAID', 'Unbezahlter Urlaub', 'Nghỉ không lương', 'UNPAID', FALSE);
