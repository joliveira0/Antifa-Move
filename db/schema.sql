CREATE TABLE IF NOT EXISTS news (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    author TEXT,
    summary TEXT NOT NULL,
    body TEXT,
    image TEXT,
    date TEXT NOT NULL,
    iso_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE news ADD COLUMN IF NOT EXISTS author TEXT;

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    format TEXT NOT NULL,
    pages INTEGER NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    url TEXT,
    status TEXT NOT NULL DEFAULT 'published',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS histories (
    id TEXT PRIMARY KEY,
    year TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    image TEXT,
    status TEXT NOT NULL DEFAULT 'published',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lambes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    lines JSONB NOT NULL,
    background TEXT NOT NULL,
    foreground TEXT NOT NULL,
    border TEXT NOT NULL,
    rotation NUMERIC(4,2) NOT NULL DEFAULT 0,
    preview_url TEXT,
    download_url TEXT,
    format TEXT NOT NULL DEFAULT 'A3',
    status TEXT NOT NULL DEFAULT 'published',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS news_position_idx ON news (position, id);
CREATE INDEX IF NOT EXISTS news_status_created_idx ON news (status, created_at DESC);
CREATE INDEX IF NOT EXISTS documents_position_idx ON documents (position, id);
CREATE INDEX IF NOT EXISTS documents_status_created_idx ON documents (status, created_at DESC);
CREATE INDEX IF NOT EXISTS histories_position_idx ON histories (position, id);
CREATE INDEX IF NOT EXISTS lambes_position_idx ON lambes (position, id);