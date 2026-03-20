/*
  # Estrutura Completa de Usuários e Hierarquia - NIVVIO POLI
  
  1. Tipos de Acesso:
    - ADMIN: Gestão central estratégica
    - COORDINATOR: Gestão regional
    - MICRO: Agente de campo (visitas)
    
  2. Tabelas e Relacionamentos:
    - `profiles`: Já existente, será o ponto central de dados dos usuários (Auth.Users -> Profile)
    - `regions`: Áreas geográficas de atuação
    - `user_management`: Funções auxiliares para gestão de hierarquia
*/

-- 1. Criar tipo enum para os papéis (se não foi criado na anterior)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'coordinator', 'micro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Garantir que a tabela profiles tenha as colunas necessárias para hierarquia
-- Adicionando colunas se não existirem
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'micro';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS region_name text; -- Ex: 'Norte', 'Curitiba Centro'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS supervisor_id uuid REFERENCES auth.users(id); -- Quem gerencia este usuário (Micro -> Coord -> Admin)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS document_number text; -- CPF/RG
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_url text;

-- 3. Criar Tabela de Eleitores (Cadastrados pelos Micros)
CREATE TABLE IF NOT EXISTS voters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  address text,
  city text,
  neighborhood text,
  fidelity_score int DEFAULT 3, -- 1 a 5 (Escala de fidelidade solicitada)
  last_visit_at timestamptz DEFAULT now(),
  observations text,
  photo_url text,
  latitude float,
  longitude float,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id), -- O Micro que cadastrou
  coordinator_id uuid REFERENCES auth.users(id) -- O Coordenador responsável pela região
);

-- 4. Criar Tabela de Visitas/Relatórios
CREATE TABLE IF NOT EXISTS field_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  micro_id uuid REFERENCES auth.users(id) NOT NULL,
  voter_id uuid REFERENCES voters(id),
  description text NOT NULL,
  photo_url text,
  location_lat float,
  location_lng float,
  visit_type text DEFAULT 'standard', -- 'reunião', 'visita porta a porta', etc
  created_at timestamptz DEFAULT now()
);

-- 5. Segurança RLS (Row Level Security)

ALTER TABLE voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_reports ENABLE ROW LEVEL SECURITY;

-- Políticas para PROFILE
-- Admin vê tudo, usuários veem os perfis que gerenciam ou seu próprio
CREATE POLICY "Admin vê todos os perfis" ON profiles FOR ALL TO authenticated USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Coordenador vê seus micros
CREATE POLICY "Coordenador vê seus micros" ON profiles FOR SELECT TO authenticated USING (
  supervisor_id = auth.uid() OR id = auth.uid()
);

-- Políticas para VOTERS (Eleitores)
CREATE POLICY "Micro vê seus eleitores" ON voters FOR ALL TO authenticated USING (
  created_by = auth.uid()
);

CREATE POLICY "Coordenador vê eleitores da sua região" ON voters FOR SELECT TO authenticated USING (
  coordinator_id = auth.uid()
);

CREATE POLICY "Admin vê todos os eleitores" ON voters FOR ALL TO authenticated USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- 6. Triggers para Auditoria
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Adicionar updated_at se não existir em profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DROP TRIGGER IF EXISTS tr_update_profiles_timestamp ON profiles;
CREATE TRIGGER tr_update_profiles_timestamp
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();
