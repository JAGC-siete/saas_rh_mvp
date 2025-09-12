-- Crear tablas parametrizadas para reglas de cálculo de nómina
-- Honduras 2025 - IHSS, RAP, ISR con vigencia y fuentes oficiales

-- Tabla para reglas IHSS
CREATE TABLE IF NOT EXISTS public.ihss_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  regime TEXT NOT NULL CHECK (regime IN ('EM', 'IVM', 'COMBINED')),
  employer_rate DECIMAL(5,4) NOT NULL CHECK (employer_rate >= 0 AND employer_rate <= 1),
  employee_rate DECIMAL(5,4) NOT NULL CHECK (employee_rate >= 0 AND employee_rate <= 1),
  ceiling DECIMAL(10,2) NOT NULL CHECK (ceiling > 0),
  effective_from DATE NOT NULL,
  effective_to DATE,
  source_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraint: no overlapping periods for same regime
  CONSTRAINT ihss_rules_no_overlap EXCLUDE USING gist (
    regime WITH =,
    daterange(effective_from, effective_to, '[]') WITH &&
  )
);

-- Tabla para reglas RAP
CREATE TABLE IF NOT EXISTS public.rap_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  employee_rate DECIMAL(5,4) NOT NULL CHECK (employee_rate >= 0 AND employee_rate <= 1),
  employer_rate DECIMAL(5,4) NOT NULL CHECK (employer_rate >= 0 AND employer_rate <= 1),
  floor DECIMAL(10,2) NOT NULL CHECK (floor > 0),
  effective_from DATE NOT NULL,
  effective_to DATE,
  source_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraint: no overlapping periods
  CONSTRAINT rap_rules_no_overlap EXCLUDE USING gist (
    daterange(effective_from, effective_to, '[]') WITH &&
  )
);

-- Tabla para brackets ISR (SAR Honduras)
CREATE TABLE IF NOT EXISTS public.isr_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  bracket_order INTEGER NOT NULL CHECK (bracket_order > 0),
  min_amount DECIMAL(10,2) NOT NULL CHECK (min_amount >= 0),
  max_amount DECIMAL(10,2) CHECK (max_amount IS NULL OR max_amount > min_amount),
  rate DECIMAL(5,4) NOT NULL CHECK (rate >= 0 AND rate <= 1),
  fixed_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (fixed_amount >= 0),
  effective_from DATE NOT NULL,
  effective_to DATE,
  source_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraint: no overlapping brackets
  CONSTRAINT isr_brackets_no_overlap EXCLUDE USING gist (
    year WITH =,
    numrange(min_amount::numeric, COALESCE(max_amount, 'infinity')::numeric, '[)') WITH &&
  )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ihss_rules_year_regime ON public.ihss_rules(year, regime);
CREATE INDEX IF NOT EXISTS idx_ihss_rules_effective ON public.ihss_rules(effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_rap_rules_year ON public.rap_rules(year);
CREATE INDEX IF NOT EXISTS idx_rap_rules_effective ON public.rap_rules(effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_isr_brackets_year ON public.isr_brackets(year, bracket_order);
CREATE INDEX IF NOT EXISTS idx_isr_brackets_effective ON public.isr_brackets(effective_from, effective_to);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ihss_rules_updated_at BEFORE UPDATE ON public.ihss_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rap_rules_updated_at BEFORE UPDATE ON public.rap_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_isr_brackets_updated_at BEFORE UPDATE ON public.isr_brackets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.ihss_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rap_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.isr_brackets ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Solo lectura para authenticated
CREATE POLICY "Authenticated users can read ihss_rules" ON public.ihss_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read rap_rules" ON public.rap_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read isr_brackets" ON public.isr_brackets FOR SELECT TO authenticated USING (true);

-- Insertar datos oficiales Honduras 2025
-- Fuente: Comunicado RAP 2025, PwC Honduras, SAR Honduras

-- IHSS 2025 - Datos oficiales
INSERT INTO public.ihss_rules (year, regime, employer_rate, employee_rate, ceiling, effective_from, effective_to, source_url, notes) VALUES
-- EM (Enfermedad y Maternidad)
(2025, 'EM', 0.0500, 0.0250, 11903.13, '2025-01-01', '2025-12-31', 'https://www.pwc.com/ia/es/publicaciones/Noticias-Tax-Legal/Tax-and-legal-2025/cotizaciones-2025-IHSS.pdf', 'EM: 5% patrono + 2.5% trabajador, techo L 11,903.13'),
-- IVM (Invalidez, Vejez y Muerte)
(2025, 'IVM', 0.0350, 0.0250, 11903.13, '2025-01-01', '2025-12-31', 'https://www.pwc.com/ia/es/publicaciones/Noticias-Tax-Legal/Tax-and-legal-2025/cotizaciones-2025-IHSS.pdf', 'IVM: 3.5% patrono + 2.5% trabajador, techo L 11,903.13'),
-- COMBINED (para cálculos simplificados)
(2025, 'COMBINED', 0.0850, 0.0500, 11903.13, '2025-01-01', '2025-12-31', 'https://www.pwc.com/ia/es/publicaciones/Noticias-Tax-Legal/Tax-and-legal-2025/cotizaciones-2025-IHSS.pdf', 'COMBINED: 8.5% patrono + 5% trabajador, techo L 11,903.13')
ON CONFLICT DO NOTHING;

-- RAP 2025 - Datos oficiales
INSERT INTO public.rap_rules (year, employee_rate, employer_rate, floor, effective_from, effective_to, source_url, notes) VALUES
(2025, 0.0150, 0.0150, 11903.13, '2025-01-01', '2025-12-31', 'https://www.rap.hn/wp-content/uploads/2025/01/COMUNICADO-TECHOS-Y-PORCENTAJES-2025-RAP-1.pdf', 'RAP: 1.5% trabajador + 1.5% patrono, piso L 11,903.13')
ON CONFLICT DO NOTHING;

-- ISR 2025 - Tabla progresiva SAR Honduras
INSERT INTO public.isr_brackets (year, bracket_order, min_amount, max_amount, rate, fixed_amount, effective_from, effective_to, source_url, notes) VALUES
-- Tramo 1: Exento hasta L 21,457.76
(2025, 1, 0.00, 21457.76, 0.0000, 0.00, '2025-01-01', '2025-12-31', 'https://www.sar.gob.hn/isr/', 'Exento hasta L 21,457.76'),
-- Tramo 2: 15% sobre excedente de L 21,457.76 hasta L 30,969.88
(2025, 2, 21457.76, 30969.88, 0.1500, 0.00, '2025-01-01', '2025-12-31', 'https://www.sar.gob.hn/isr/', '15% sobre excedente de L 21,457.76 hasta L 30,969.88'),
-- Tramo 3: 20% sobre excedente de L 30,969.88 hasta L 67,604.36
(2025, 3, 30969.88, 67604.36, 0.2000, 1428.32, '2025-01-01', '2025-12-31', 'https://www.sar.gob.hn/isr/', '20% sobre excedente de L 30,969.88 hasta L 67,604.36, base L 1,428.32'),
-- Tramo 4: 25% sobre excedente de L 67,604.36
(2025, 4, 67604.36, NULL, 0.2500, 8734.32, '2025-01-01', '2025-12-31', 'https://www.sar.gob.hn/isr/', '25% sobre excedente de L 67,604.36, base L 8,734.32')
ON CONFLICT DO NOTHING;

-- Función helper para obtener reglas vigentes
CREATE OR REPLACE FUNCTION get_ihss_rules(p_year INTEGER, p_regime TEXT, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  employer_rate DECIMAL(5,4),
  employee_rate DECIMAL(5,4),
  ceiling DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT r.employer_rate, r.employee_rate, r.ceiling
  FROM public.ihss_rules r
  WHERE r.year = p_year
    AND r.regime = p_regime
    AND r.effective_from <= p_date
    AND (r.effective_to IS NULL OR r.effective_to >= p_date)
  ORDER BY r.effective_from DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_rap_rules(p_year INTEGER, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  employee_rate DECIMAL(5,4),
  employer_rate DECIMAL(5,4),
  floor DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT r.employee_rate, r.employer_rate, r.floor
  FROM public.rap_rules r
  WHERE r.year = p_year
    AND r.effective_from <= p_date
    AND (r.effective_to IS NULL OR r.effective_to >= p_date)
  ORDER BY r.effective_from DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_isr_brackets(p_year INTEGER, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  bracket_order INTEGER,
  min_amount DECIMAL(10,2),
  max_amount DECIMAL(10,2),
  rate DECIMAL(5,4),
  fixed_amount DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.bracket_order, b.min_amount, b.max_amount, b.rate, b.fixed_amount
  FROM public.isr_brackets b
  WHERE b.year = p_year
    AND b.effective_from <= p_date
    AND (b.effective_to IS NULL OR b.effective_to >= p_date)
  ORDER BY b.bracket_order;
END;
$$ LANGUAGE plpgsql;

-- Permisos
GRANT SELECT ON public.ihss_rules TO authenticated;
GRANT SELECT ON public.rap_rules TO authenticated;
GRANT SELECT ON public.isr_brackets TO authenticated;
GRANT EXECUTE ON FUNCTION get_ihss_rules TO authenticated;
GRANT EXECUTE ON FUNCTION get_rap_rules TO authenticated;
GRANT EXECUTE ON FUNCTION get_isr_brackets TO authenticated;
