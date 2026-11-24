CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  data TEXT NOT NULL CHECK (jsonb_typeof(data::jsonb) = 'object')
);
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires BIGINT NOT NULL
);
CREATE INDEX sessions_user_id_expires_idx ON sessions(user_id, expires);
CREATE TABLE resets (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires BIGINT NOT NULL
);
CREATE INDEX resets_user_id_expires_idx ON resets(user_id, expires);
CREATE TABLE records (
  seq BIGSERIAL NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  owner TEXT,
  data TEXT NOT NULL CHECK (jsonb_typeof(data::jsonb) = 'object'),
  embedding vector,
  PRIMARY KEY (kind,id)
);
CREATE INDEX records_kind_owner_idx ON records(kind, owner);
CREATE INDEX records_document_idx ON records ((data::jsonb->>'documentId')) WHERE kind='document-chunks';
CREATE TABLE assets (id TEXT PRIMARY KEY, content BYTEA NOT NULL);

