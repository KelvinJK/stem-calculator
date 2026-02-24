-- ============================================================
-- STEM Session Cost Calculator — Database Migrations
-- Run: psql $DATABASE_URL -f 001_initial.sql
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(120) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role        VARCHAR(20) NOT NULL DEFAULT 'marketing'
                    CHECK (role IN ('admin','curator','marketing')),
    reset_token TEXT,
    reset_token_expires TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Materials (price library) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS materials (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    unit_type   VARCHAR(20) NOT NULL DEFAULT 'pcs'
                    CHECK (unit_type IN ('pcs','g','ml','m','hrs')),
    pack_size   NUMERIC(12,4) NOT NULL,
    pack_price  NUMERIC(12,2) NOT NULL,
    category    VARCHAR(100),
    notes       TEXT,
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Price versions (history) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS price_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id     UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    pack_price      NUMERIC(12,2) NOT NULL,
    pack_size       NUMERIC(12,4) NOT NULL,
    effective_from  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    set_by          UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ── Activities ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(200) NOT NULL,
    category            VARCHAR(50) NOT NULL DEFAULT 'Science'
                            CHECK (category IN ('Science','Engineering','Technology','Mathematics')),
    age_group           VARCHAR(60),
    duration_mins       INTEGER,
    default_students    INTEGER DEFAULT 20,
    description         TEXT,
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    is_locked           BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Activity Materials (junction) ─────────────────────────────
CREATE TABLE IF NOT EXISTS activity_materials (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id         UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    material_id         UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
    qty_used            NUMERIC(12,4) NOT NULL,
    consumption_mode    VARCHAR(20) NOT NULL DEFAULT 'per_student'
                            CHECK (consumption_mode IN ('per_student','per_group','per_session')),
    group_size          INTEGER DEFAULT 1,
    waste_pct           NUMERIC(5,2) DEFAULT 0,
    manual_override     BOOLEAN NOT NULL DEFAULT FALSE,
    manual_unit_cost    NUMERIC(12,4),
    sort_order          INTEGER DEFAULT 0
);

-- ── Sessions (quotations) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    client_name     VARCHAR(200),
    client_contact  VARCHAR(200),
    student_count   INTEGER NOT NULL DEFAULT 20,
    margin_pct      NUMERIC(5,2) NOT NULL DEFAULT 30,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','pending','approved','rejected')),
    notes           TEXT,
    rejection_note  TEXT,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Session Activities (which activities in a session) ────────
CREATE TABLE IF NOT EXISTS session_activities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    activity_id     UUID NOT NULL REFERENCES activities(id) ON DELETE RESTRICT,
    sort_order      INTEGER DEFAULT 0
);

-- ── Invoices ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
    invoice_number  VARCHAR(50) NOT NULL UNIQUE,
    pdf_path        TEXT,
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    issued_by       UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Invoice number sequence
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1000;

-- ── Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_materials_name ON materials USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_by ON sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_price_versions_material ON price_versions(material_id, effective_from DESC);

-- ── Updated_at trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE TRIGGER trg_materials_updated_at
    BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE TRIGGER trg_activities_updated_at
    BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE TRIGGER trg_sessions_updated_at
    BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
