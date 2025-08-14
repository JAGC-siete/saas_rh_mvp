-- COMPLETAR MIGRACIÓN DE GAMIFICACIÓN (100% LIMPIO)
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Crear función para actualizar timestamps
CREATE OR REPLACE FUNCTION update_employee_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear función para calcular puntos de asistencia
CREATE OR REPLACE FUNCTION calculate_attendance_points(
    p_employee_id UUID,
    p_late_minutes INTEGER,
    p_is_early BOOLEAN DEFAULT FALSE
) RETURNS INTEGER AS $$
DECLARE
    points INTEGER := 0;
BEGIN
    -- Base points for attendance
    points := 5;
    
    -- Early arrival bonus
    IF p_is_early THEN
        points := points + 3;
    END IF;
    
    -- Punctuality bonus
    IF p_late_minutes <= 5 THEN
        points := points + 2;
    END IF;
    
    -- Perfect attendance bonus (no late minutes)
    IF p_late_minutes = 0 THEN
        points := points + 5;
    END IF;
    
    -- Penalty for being late
    IF p_late_minutes > 5 THEN
        points := points - LEAST(10, p_late_minutes / 5);
    END IF;
    
    -- Minimum 0 points
    RETURN GREATEST(0, points);
END;
$$ LANGUAGE plpgsql;

-- 3. Crear función para actualizar puntuación del empleado (SIN ON CONFLICT)
CREATE OR REPLACE FUNCTION update_employee_score(
    p_employee_id UUID,
    p_company_id UUID,
    p_points_to_add INTEGER,
    p_reason VARCHAR(255),
    p_action_type VARCHAR(50)
) RETURNS VOID AS $$
BEGIN
    -- Intentar insertar primero
    BEGIN
        INSERT INTO employee_scores (employee_id, company_id, total_points, weekly_points, monthly_points)
        VALUES (p_employee_id, p_company_id, p_points_to_add, p_points_to_add, p_points_to_add);
    EXCEPTION WHEN unique_violation THEN
        -- Si ya existe, actualizar
        UPDATE employee_scores 
        SET 
            total_points = total_points + p_points_to_add,
            weekly_points = weekly_points + p_points_to_add,
            monthly_points = monthly_points + p_points_to_add,
            updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = p_employee_id;
    END;
    
    -- Record in point history
    INSERT INTO point_history (employee_id, company_id, points_earned, reason, action_type)
    VALUES (p_employee_id, p_company_id, p_points_to_add, p_reason, p_action_type);
END;
$$ LANGUAGE plpgsql;

-- 4. Crear trigger para actualizar timestamps
DROP TRIGGER IF EXISTS employee_scores_updated_at ON employee_scores;
CREATE TRIGGER employee_scores_updated_at
    BEFORE UPDATE ON employee_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_scores_updated_at();

-- 5. Crear vista del leaderboard
CREATE OR REPLACE VIEW employee_leaderboard AS
SELECT 
    es.employee_id,
    e.name,
    e.employee_code,
    es.total_points,
    es.weekly_points,
    es.monthly_points,
    es.punctuality_streak,
    es.early_arrival_count,
    es.perfect_week_count,
    es.company_id,
    RANK() OVER (PARTITION BY es.company_id ORDER BY es.total_points DESC) as total_rank,
    RANK() OVER (PARTITION BY es.company_id ORDER BY es.weekly_points DESC) as weekly_rank,
    RANK() OVER (PARTITION BY es.company_id ORDER BY es.monthly_points DESC) as monthly_rank
FROM employee_scores es
JOIN employees e ON es.employee_id = e.id
WHERE e.status = 'active';

-- 6. Insertar achievement types (SIN ON CONFLICT)
DO $$
BEGIN
    -- Solo insertar si no existen
    IF NOT EXISTS (SELECT 1 FROM achievement_types WHERE name = 'Perfect Week') THEN
        INSERT INTO achievement_types (name, description, icon, points_reward, badge_color, requirements) 
        VALUES ('Perfect Week', 'Llegar puntual toda la semana', '🏆', 50, 'gold', '{"type": "weekly", "required_days": 5, "max_late_minutes": 5}');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM achievement_types WHERE name = 'Early Bird') THEN
        INSERT INTO achievement_types (name, description, icon, points_reward, badge_color, requirements) 
        VALUES ('Early Bird', 'Llegar temprano 5 días seguidos', '🌅', 30, 'blue', '{"type": "streak", "required_days": 5, "early_minutes": 5}');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM achievement_types WHERE name = 'Punctuality Champion') THEN
        INSERT INTO achievement_types (name, description, icon, points_reward, badge_color, requirements) 
        VALUES ('Punctuality Champion', 'Llegar puntual 10 días seguidos', '⭐', 75, 'purple', '{"type": "streak", "required_days": 10, "max_late_minutes": 5}');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM achievement_types WHERE name = 'Month Master') THEN
        INSERT INTO achievement_types (name, description, icon, points_reward, badge_color, requirements) 
        VALUES ('Month Master', 'Asistencia perfecta por un mes', '📅', 100, 'diamond', '{"type": "monthly", "required_attendance": 100, "max_absences": 0}');
    END IF;
END $$;

-- 7. Verificar que todo está funcionando
SELECT '✅ MIGRACIÓN COMPLETADA SIN ON CONFLICT' as status;
