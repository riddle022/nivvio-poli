/*
  # Configuração Inicial - NIVVIO POLI
  
  1. Novas Tabelas
    - `profiles` - Perfis de usuários vinculados ao auth.users
      - `id` (uuid, PK, FK para auth.users)
      - `username` (text, único)
      - `full_name` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `candidates` - Candidatos eleitorais
      - `id` (uuid, PK)
      - `name` (text) - Nome completo
      - `party` (text) - Partido
      - `position` (text) - Cargo (Vereador, Prefeito, etc)
      - `city` (text) - Município
      - `number` (text) - Número de candidato
      - `photo_url` (text) - URL da foto
      - `status` (text) - Status (Ativo, Inativo)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid, FK para auth.users)
  
  2. Segurança
    - RLS habilitado em todas as tabelas
    - Policies para usuários autenticados
*/

-- Tabela de perfis
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver todos os perfis"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Permitir inserção de perfil próprio"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Tabela de candidatos
CREATE TABLE IF NOT EXISTS candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  party text NOT NULL,
  position text NOT NULL,
  city text NOT NULL,
  number text NOT NULL,
  photo_url text DEFAULT '',
  status text DEFAULT 'Ativo',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver candidatos"
  ON candidates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir candidatos"
  ON candidates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Usuários autenticados podem atualizar candidatos"
  ON candidates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem deletar candidatos"
  ON candidates FOR DELETE
  TO authenticated
  USING (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();