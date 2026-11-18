-- Initial schema for a NEW MySQL 8 database. Apply once before enabling the mysql profile.
-- Existing databases require an explicit migration review; this script does not drop data.
CREATE TABLE legal_entities (
 id VARCHAR(255) PRIMARY KEY, version BIGINT NOT NULL, created_at DATETIME(6),
 code VARCHAR(255) NOT NULL UNIQUE, name VARCHAR(255), registration_number VARCHAR(255), address VARCHAR(255), active BIT NOT NULL
);
CREATE TABLE user_accounts (
 id VARCHAR(255) PRIMARY KEY, version BIGINT NOT NULL, created_at DATETIME(6),
 email VARCHAR(255) NOT NULL UNIQUE, name VARCHAR(255) NOT NULL, password_hash VARCHAR(255) NOT NULL,
 roles VARCHAR(255), legal_entity_ids VARCHAR(4000), branch_ids VARCHAR(4000), active BIT NOT NULL,
 mfa_enabled BIT NOT NULL, mfa_secret VARCHAR(1024), last_totp_step BIGINT NOT NULL,
 auth_version INT NOT NULL, failures INT NOT NULL, locked_until DATETIME(6), last_login DATETIME(6)
);
CREATE TABLE branches (
 id VARCHAR(255) PRIMARY KEY, version BIGINT NOT NULL, created_at DATETIME(6), code VARCHAR(255) NOT NULL UNIQUE,
 name VARCHAR(255), legal_entity_id VARCHAR(255), city VARCHAR(255), address VARCHAR(255), state_code VARCHAR(255),
 timezone VARCHAR(255), active BIT NOT NULL, accent VARCHAR(255),
 CONSTRAINT fk_branch_entity FOREIGN KEY(legal_entity_id) REFERENCES legal_entities(id)
);
CREATE TABLE work_locations (
 id VARCHAR(255) PRIMARY KEY, version BIGINT NOT NULL, created_at DATETIME(6), branch_id VARCHAR(255), name VARCHAR(255),
 address VARCHAR(255), state_code VARCHAR(255), timezone VARCHAR(255), active BIT NOT NULL,
 CONSTRAINT fk_location_branch FOREIGN KEY(branch_id) REFERENCES branches(id)
);
CREATE TABLE employee_refs (
 id VARCHAR(255) PRIMARY KEY, version BIGINT NOT NULL, created_at DATETIME(6), name VARCHAR(255), position VARCHAR(255), home_branch_id VARCHAR(255),
 CONSTRAINT fk_employee_home FOREIGN KEY(home_branch_id) REFERENCES branches(id)
);
CREATE TABLE employee_assignments (
 id VARCHAR(255) PRIMARY KEY, version BIGINT NOT NULL, created_at DATETIME(6), employee_id VARCHAR(255), branch_id VARCHAR(255),
 work_location_id VARCHAR(255), valid_from DATE, valid_to DATE, kind VARCHAR(255), reason VARCHAR(500),
 state_code VARCHAR(255), timezone VARCHAR(255), address_snapshot VARCHAR(255),
 CONSTRAINT fk_assignment_employee FOREIGN KEY(employee_id) REFERENCES employee_refs(id),
 CONSTRAINT fk_assignment_branch FOREIGN KEY(branch_id) REFERENCES branches(id),
 CONSTRAINT fk_assignment_location FOREIGN KEY(work_location_id) REFERENCES work_locations(id),
 INDEX idx_employee_period(employee_id,valid_from,valid_to)
);
CREATE TABLE manager_assignments (
 id VARCHAR(255) PRIMARY KEY, version BIGINT NOT NULL, created_at DATETIME(6), manager_id VARCHAR(255), branch_id VARCHAR(255), valid_from DATE, valid_to DATE,
 CONSTRAINT fk_manager_user FOREIGN KEY(manager_id) REFERENCES user_accounts(id),
 CONSTRAINT fk_manager_branch FOREIGN KEY(branch_id) REFERENCES branches(id),
 INDEX idx_manager_period(branch_id,valid_from,valid_to)
);
CREATE TABLE audit_events (
 id VARCHAR(255) PRIMARY KEY, version BIGINT NOT NULL, created_at DATETIME(6), actor_id VARCHAR(255), actor_name VARCHAR(255),
 action VARCHAR(255), target VARCHAR(255), branch_id VARCHAR(255), detail VARCHAR(4000), INDEX idx_audit_time(created_at)
);
CREATE TABLE account_resets (
 id VARCHAR(255) PRIMARY KEY, version BIGINT NOT NULL, created_at DATETIME(6), token_hash VARCHAR(255) UNIQUE, user_id VARCHAR(255), expires_at DATETIME(6), used BIT NOT NULL,
 CONSTRAINT fk_reset_user FOREIGN KEY(user_id) REFERENCES user_accounts(id)
);
CREATE TABLE account_sessions (
 id VARCHAR(255) PRIMARY KEY, version BIGINT NOT NULL, created_at DATETIME(6), user_id VARCHAR(255), session_hash VARCHAR(255),
 agent VARCHAR(255), revoked BIT NOT NULL, expires_at DATETIME(6),
 CONSTRAINT fk_session_user FOREIGN KEY(user_id) REFERENCES user_accounts(id), INDEX idx_session_user(user_id)
);
