-- Verifica e adiciona as colunas caso a tabela "meetings" já existisse parcialmente
DO $$
BEGIN
    -- Se a tabela não existir, será criada
    CREATE TABLE IF NOT EXISTS meetings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title text NOT NULL,
        description text,
        date date NOT NULL,
        time time NOT NULL,
        location_type text NOT NULL CHECK (location_type IN ('online', 'presencial')),
        location_address text NOT NULL,
        audience_type text NOT NULL CHECK (audience_type IN ('region', 'city', 'specific')),
        region_id uuid REFERENCES regions(id) ON DELETE CASCADE,
        city_id uuid REFERENCES cities(id) ON DELETE CASCADE,
        micro_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
        created_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
        status text NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada', 'realizada', 'cancelada')),
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
    );

    -- Se a tabela já existia sem a coluna created_by, vamos adicioná-la
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'created_by') THEN
        ALTER TABLE meetings ADD COLUMN created_by uuid REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    -- Se existia sem a coluna title, por exemplo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meetings' AND column_name = 'title') THEN
        ALTER TABLE meetings ADD COLUMN title text;
        ALTER TABLE meetings ADD COLUMN description text;
        ALTER TABLE meetings ADD COLUMN date date;
        ALTER TABLE meetings ADD COLUMN time time;
        ALTER TABLE meetings ADD COLUMN location_type text DEFAULT 'presencial';
        ALTER TABLE meetings ADD COLUMN location_address text DEFAULT '';
        ALTER TABLE meetings ADD COLUMN audience_type text DEFAULT 'specific';
        ALTER TABLE meetings ADD COLUMN region_id uuid REFERENCES regions(id) ON DELETE CASCADE;
        ALTER TABLE meetings ADD COLUMN city_id uuid REFERENCES cities(id) ON DELETE CASCADE;
        ALTER TABLE meetings ADD COLUMN micro_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
        ALTER TABLE meetings ADD COLUMN status text DEFAULT 'agendada';
    END IF;
END $$;

-- Habilitar Políticas de Segurança
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coordenadores gerenciam suas próprias reuniões" ON meetings;
CREATE POLICY "Coordenadores gerenciam suas próprias reuniões"
ON meetings FOR ALL
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Micros podem ver reuniões direcionadas a eles" ON meetings;
CREATE POLICY "Micros podem ver reuniões direcionadas a eles"
ON meetings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('micro', 'coordinator', 'admin')
  )
);

DROP POLICY IF EXISTS "Admins podem ver todas as reuniões" ON meetings;
CREATE POLICY "Admins podem ver todas as reuniões"
ON meetings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
