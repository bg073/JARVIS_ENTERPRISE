-- Privileges and Projects relational schema (source of truth)

CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_roles (
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (employee_id, role_id)
);

CREATE TABLE IF NOT EXISTS privileges (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    scope TEXT NOT NULL, -- e.g., 'global' or 'project'
    description TEXT
);

CREATE TABLE IF NOT EXISTS employee_privileges (
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    privilege_id INTEGER NOT NULL REFERENCES privileges(id) ON DELETE CASCADE,
    project_id INTEGER NULL REFERENCES projects(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ NULL,
    PRIMARY KEY (employee_id, privilege_id, COALESCE(project_id, -1))
);

CREATE TABLE IF NOT EXISTS project_assignments (
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    allocation_percent INTEGER NOT NULL DEFAULT 100,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ NULL,
    PRIMARY KEY (employee_id, project_id)
);

-- Seed minimal roles/privileges (idempotent)
INSERT INTO roles(name, description)
VALUES ('employee', 'Base employee role')
ON CONFLICT (name) DO NOTHING;

INSERT INTO privileges(key, scope, description)
VALUES
  ('db_read', 'project', 'Read access to project database'),
  ('db_write', 'project', 'Write access to project database'),
  ('repo_access', 'project', 'Access to project repository'),
  ('vpn_access', 'global', 'Company VPN access')
ON CONFLICT (key) DO NOTHING;

-- Employee Skills Map
CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS employee_skills (
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency SMALLINT NOT NULL CHECK (proficiency BETWEEN 0 AND 5),
    confidence NUMERIC(3,2) NOT NULL DEFAULT 0.8,
    last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (employee_id, skill_id)
);

-- Snapshot of latest overall scoring/roles/skills from LLM
CREATE TABLE IF NOT EXISTS employee_skill_snapshot (
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    overall_score SMALLINT NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
    roles_json JSONB NOT NULL,
    skills_json JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional: evidence table to store references back to sources (RAG/OpenSearch/Qdrant)
CREATE TABLE IF NOT EXISTS employee_skill_evidence (
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    skill_id INTEGER NULL REFERENCES skills(id) ON DELETE SET NULL,
    project_code TEXT NULL,
    source_type TEXT NOT NULL, -- e.g., 'rag_os', 'rag_vec'
    source_ref TEXT NOT NULL,  -- e.g., doc id / chunk id / index name
    snippet TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
