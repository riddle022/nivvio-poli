-- Adiciona relation de cidade e região na tabela de eleitores (voters)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'voters' AND column_name = 'city_id') THEN
        ALTER TABLE voters ADD COLUMN city_id uuid REFERENCES cities(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'voters' AND column_name = 'region_id') THEN
        ALTER TABLE voters ADD COLUMN region_id uuid REFERENCES regions(id) ON DELETE SET NULL;
    END IF;
END $$;
