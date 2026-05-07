-- ============================================================
-- Autovion — Supabase Schema
-- Execute este SQL no painel do Supabase:
--   Dashboard → SQL Editor → New Query → Cole e Execute
-- ============================================================

-- Perfis de usuários (ligado ao auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name        TEXT,
  plan        TEXT    NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','agency')),
  credits     INTEGER NOT NULL DEFAULT 3,
  api_keys    JSONB   NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projetos de vídeo
CREATE TABLE IF NOT EXISTS projects (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID    REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title       TEXT,
  theme       TEXT    NOT NULL,
  style       TEXT    NOT NULL,
  voice       TEXT    NOT NULL DEFAULT 'echo',
  format      TEXT    NOT NULL DEFAULT 'youtube',
  script      JSONB,
  status      TEXT    NOT NULL DEFAULT 'ready' CHECK (status IN ('pending','ready','error')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversas da ARIA
CREATE TABLE IF NOT EXISTS chats (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID    REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title       TEXT    NOT NULL DEFAULT 'Nova Conversa',
  pinned      BOOLEAN NOT NULL DEFAULT FALSE,
  model_used  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mensagens das conversas
CREATE TABLE IF NOT EXISTS messages (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id     UUID    REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  role        TEXT    NOT NULL CHECK (role IN ('user','assistant')),
  content     TEXT    NOT NULL,
  model       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_projects_user  ON projects(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_user     ON chats(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat  ON messages(chat_id, created_at);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats    ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles: usuário acessa apenas o próprio
CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Projects: usuário acessa apenas os próprios
CREATE POLICY "projects_own" ON projects
  FOR ALL USING (auth.uid() = user_id);

-- Chats: usuário acessa apenas os próprios
CREATE POLICY "chats_own" ON chats
  FOR ALL USING (auth.uid() = user_id);

-- Messages: usuário acessa mensagens de chats próprios
CREATE POLICY "messages_own" ON messages
  FOR ALL USING (
    chat_id IN (SELECT id FROM chats WHERE user_id = auth.uid())
  );

-- ── Trigger: cria perfil automaticamente ao cadastrar ─────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Trigger: atualiza updated_at dos chats ───────────────────────────────────

CREATE OR REPLACE FUNCTION update_chat_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE chats SET updated_at = NOW() WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_insert ON messages;
CREATE TRIGGER on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_chat_timestamp();
