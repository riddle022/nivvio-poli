/*
  # Adição de Níveis de Acesso (Roles)
  
  1. Alterações
    - Criação do tipo enum `user_role` (admin, coordinator, micro)
    - Adição da coluna `role` na tabela `profiles`
    - Atualização das políticas de RLS para considerar os papéis
*/

-- Criar tipo enum para os papéis se não existir
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'coordinator', 'micro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Adicionar coluna role na tabela profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'micro';

-- Atualizar políticas de RLS para profiles
DROP POLICY IF EXISTS "Usuários podem ver todos os perfis" ON profiles;
CREATE POLICY "Admin pode gerenciar todos os perfis"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Usuários podem ver perfis vinculados"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Tabela para Coordenadores Regionais (extensão de profiles ou relação)
-- Nota: Usaremos o próprio profile com role='coordinator'

-- Tabela para Micros (Agentes de Campo)
-- Nota: Usaremos o próprio profile com role='micro'

-- Adicionar coluna region para coordenadores e micros
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS region text;

-- Adicionar coluna supervisor_id para micros se vincularem a um coordenador
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS supervisor_id uuid REFERENCES profiles(id);
