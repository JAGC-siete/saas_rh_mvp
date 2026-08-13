-- Employee Habit Tracker MVP: catalog, enrollment, daily check-ins

-- =============================================================================
-- habit_definitions — global catalog
-- =============================================================================
CREATE TABLE IF NOT EXISTS habit_definitions (
    id SERIAL PRIMARY KEY,
    area TEXT NOT NULL CHECK (area IN ('emotional', 'finance', 'learning', 'nutrition')),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL DEFAULT '✨',
    points_per_completion INTEGER NOT NULL DEFAULT 5,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (area, name)
);

ALTER TABLE habit_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view habit definitions" ON habit_definitions;
CREATE POLICY "Authenticated users can view habit definitions" ON habit_definitions
    FOR SELECT TO authenticated USING (true);

-- =============================================================================
-- employee_habits — employee enrollment
-- =============================================================================
CREATE TABLE IF NOT EXISTS employee_habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    habit_id INTEGER NOT NULL REFERENCES habit_definitions(id) ON DELETE CASCADE,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (employee_id, habit_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_habits_employee_id ON employee_habits(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_habits_company_id ON employee_habits(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_habits_habit_id ON employee_habits(habit_id);

CREATE OR REPLACE FUNCTION update_employee_habits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employee_habits_updated_at ON employee_habits;
CREATE TRIGGER trg_employee_habits_updated_at
    BEFORE UPDATE ON employee_habits
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_habits_updated_at();

ALTER TABLE employee_habits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees can view their own habits" ON employee_habits;
CREATE POLICY "Employees can view their own habits" ON employee_habits
    FOR SELECT USING (
        employee_id IN (
            SELECT employee_id FROM user_profiles WHERE user_profiles.id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Employees can enroll in habits" ON employee_habits;
CREATE POLICY "Employees can enroll in habits" ON employee_habits
    FOR INSERT WITH CHECK (
        employee_id IN (
            SELECT employee_id FROM user_profiles WHERE user_profiles.id = auth.uid()
        )
        AND company_id = public.get_user_company()
    );

DROP POLICY IF EXISTS "Employees can update their own habits" ON employee_habits;
CREATE POLICY "Employees can update their own habits" ON employee_habits
    FOR UPDATE USING (
        employee_id IN (
            SELECT employee_id FROM user_profiles WHERE user_profiles.id = auth.uid()
        )
    );

-- =============================================================================
-- habit_logs — daily check-offs
-- =============================================================================
CREATE TABLE IF NOT EXISTS habit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    habit_id INTEGER NOT NULL REFERENCES habit_definitions(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (employee_id, habit_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_habit_logs_employee_id ON habit_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_employee_habit_date ON habit_logs(employee_id, habit_id, log_date DESC);

ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees can view their own habit logs" ON habit_logs;
CREATE POLICY "Employees can view their own habit logs" ON habit_logs
    FOR SELECT USING (
        employee_id IN (
            SELECT employee_id FROM user_profiles WHERE user_profiles.id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Employees can log their own habits" ON habit_logs;
CREATE POLICY "Employees can log their own habits" ON habit_logs
    FOR INSERT WITH CHECK (
        employee_id IN (
            SELECT employee_id FROM user_profiles WHERE user_profiles.id = auth.uid()
        )
        AND company_id = public.get_user_company()
    );

-- =============================================================================
-- Seed catalog (16 habits, 4 per area)
-- =============================================================================
INSERT INTO habit_definitions (area, name, description, icon, points_per_completion, sort_order) VALUES
    ('emotional', 'Respiración consciente', 'Toma 5 minutos para respirar profundamente y centrarte', '🧘', 5, 1),
    ('emotional', 'Diario de gratitud', 'Escribe 3 cosas por las que estás agradecido hoy', '📝', 5, 2),
    ('emotional', 'Nombrar emociones', 'Identifica y nombra cómo te sientes en este momento', '💭', 5, 3),
    ('emotional', 'Pausa consciente', 'Haz una pausa de 2 minutos sin pantallas', '⏸️', 5, 4),
    ('finance', 'Registrar gastos', 'Anota todos los gastos del día', '💰', 5, 1),
    ('finance', 'Revisar presupuesto', 'Revisa tu presupuesto mensual y compáralo con tus gastos', '📊', 5, 2),
    ('finance', 'Apartar ahorro', 'Transfiere o aparta dinero para ahorro hoy', '🏦', 5, 3),
    ('finance', 'Evitar compra impulsiva', 'Resiste una compra impulsiva que no necesitas', '🛒', 5, 4),
    ('learning', 'Leer 10 páginas', 'Lee al menos 10 páginas de un libro o artículo', '📖', 5, 1),
    ('learning', 'Concepto nuevo', 'Aprende un concepto nuevo relacionado con tu trabajo', '💡', 5, 2),
    ('learning', 'Practicar una habilidad', 'Dedica tiempo a practicar una habilidad profesional', '🎯', 5, 3),
    ('learning', 'Contenido educativo', 'Consume contenido educativo (video, podcast, curso)', '🎓', 5, 4),
    ('nutrition', 'Tomar agua', 'Bebe al menos 8 vasos de agua durante el día', '💧', 5, 1),
    ('nutrition', 'Frutas y verduras', 'Incluye frutas o verduras en al menos 2 comidas', '🥗', 5, 2),
    ('nutrition', 'Evitar azúcar', 'Evita bebidas o snacks con azúcar añadida', '🚫', 5, 3),
    ('nutrition', 'Desayuno saludable', 'Desayuna algo nutritivo y balanceado', '🍳', 5, 4)
ON CONFLICT (area, name) DO NOTHING;

-- =============================================================================
-- Habit streak achievements
-- =============================================================================
INSERT INTO achievement_types (name, description, icon, points_reward, badge_color, requirements)
SELECT 'Hábito Constante', 'Mantén un hábito 7 días seguidos', '🔥', 30, 'orange',
       '{"type": "habit_streak", "required_days": 7}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM achievement_types WHERE name = 'Hábito Constante');

INSERT INTO achievement_types (name, description, icon, points_reward, badge_color, requirements)
SELECT 'Hábito Maestro', 'Mantén un hábito 30 días seguidos', '🏅', 100, 'gold',
       '{"type": "habit_streak", "required_days": 30}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM achievement_types WHERE name = 'Hábito Maestro');

GRANT SELECT ON habit_definitions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON employee_habits TO authenticated;
GRANT SELECT, INSERT ON habit_logs TO authenticated;
