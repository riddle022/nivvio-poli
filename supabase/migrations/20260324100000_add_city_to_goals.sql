-- Adiciona city_id na tabela campaign_goals para suportar as metas regionais por cidade
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_goals' AND column_name = 'city_id') THEN
        ALTER TABLE campaign_goals ADD COLUMN city_id uuid REFERENCES cities(id);
    END IF;
END $$;

-- Atualizar RLS para permitir que coordenadores vejam as metas de sua região
DROP POLICY IF EXISTS "Coordenadores veem metas regional/cidade" ON campaign_goals;
CREATE POLICY "Coordenadores veem metas regional/cidade"
ON campaign_goals FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (
      profiles.role = 'admin' OR 
      (profiles.role = 'coordinator' AND (
        campaign_goals.region_id IN (SELECT id FROM regions WHERE name = profiles.region_name) OR -- Se region_id for usado
        campaign_goals.city_id IN (SELECT id FROM cities WHERE region_id IN (SELECT id FROM regions WHERE name = profiles.region_name)) -- Se city_id for usado
      ))
    )
  )
);
