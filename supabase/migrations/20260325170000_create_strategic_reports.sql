-- Tabela para relatórios estratégicos dos coordenadores
CREATE TABLE IF NOT EXISTS strategic_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content text NOT NULL,
    priority text NOT NULL CHECK (priority IN ('baixa', 'normal', 'alta', 'urgente')),
    region_name text NOT NULL,
    created_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE strategic_reports ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS

-- Coordenadores podem criar e ver os próprios relatórios
CREATE POLICY "Coordenadores gerenciam seus relatórios"
ON strategic_reports FOR ALL
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Admins podem ler todos os relatórios
CREATE POLICY "Admins leem todos os relatórios estratégicos"
ON strategic_reports FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_strategic_reports_updated_at
  BEFORE UPDATE ON strategic_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
