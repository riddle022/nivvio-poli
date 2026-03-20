-- Tabela de Regiões
CREATE TABLE IF NOT EXISTS regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Tabela de Cidades (vinculadas às regiões)
CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region_id uuid REFERENCES regions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(name, region_id)
);

-- Habilitar RLS
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
-- Qualquer usuário autenticado pode ver as regiões e cidades
CREATE POLICY "Qualquer um pode ver regiões" ON regions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Apenas admin pode gerenciar regiões" ON regions
  FOR ALL TO authenticated USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Qualquer um pode ver cidades" ON cities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Apenas admin pode gerenciar cidades" ON cities
  FOR ALL TO authenticated USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Inserir algumas regiões de exemplo
INSERT INTO regions (name) VALUES 
('Norte'), 
('Sul'), 
('Leste'), 
('Oeste'), 
('Centro')
ON CONFLICT (name) DO NOTHING;

-- Inserir algumas cidades de exemplo para a região 'Sul' (como no mock da tela)
DO $$ 
DECLARE 
  region_id_sul uuid;
BEGIN
  SELECT id INTO region_id_sul FROM regions WHERE name = 'Sul';
  
  IF region_id_sul IS NOT NULL THEN
    INSERT INTO cities (name, region_id) VALUES 
    ('Curitiba', region_id_sul),
    ('Porto Alegre', region_id_sul),
    ('Florianópolis', region_id_sul)
    ON CONFLICT (name, region_id) DO NOTHING;
  END IF;
END $$;
