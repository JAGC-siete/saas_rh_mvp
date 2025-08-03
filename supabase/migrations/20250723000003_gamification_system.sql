-- Add gamification system for employee motivation

-- Employee scores table
CREATE TABLE employee_scores (
    id SERIAL PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    weekly_points INTEGER DEFAULT 0,
    monthly_points INTEGER DEFAULT 0,
    punctuality_streak INTEGER DEFAULT 0,
    early_arrival_count INTEGER DEFAULT 0,
    perfect_week_count INTEGER DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Achievement types
CREATE TABLE achievement_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    points_reward INTEGER DEFAULT 0,
    badge_color VARCHAR(20) DEFAULT 'blue',
    requirements JSONB, -- Store requirements as JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Employee achievements
CREATE TABLE employee_achievements (
    id SERIAL PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    achievement_type_id INTEGER NOT NULL REFERENCES achievement_types(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    points_earned INTEGER DEFAULT 0,
    UNIQUE(employee_id, achievement_type_id)
);

-- Point history for tracking
CREATE TABLE point_history (
    id SERIAL PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    points_earned INTEGER NOT NULL,
    reason VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'check_in', 'achievement', 'bonus', etc.
    reference_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_employee_scores_employee_id ON employee_scores(employee_id);
CREATE INDEX idx_employee_scores_company_id ON employee_scores(company_id);
CREATE INDEX idx_employee_achievements_employee_id ON employee_achievements(employee_id);
CREATE INDEX idx_employee_achievements_company_id ON employee_achievements(company_id);
CREATE INDEX idx_point_history_employee_id ON point_history(employee_id);
CREATE INDEX idx_point_history_reference_date ON point_history(reference_date);

-- RLS policies
ALTER TABLE employee_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for employee_scores
CREATE POLICY "Users can view scores from their company" ON employee_scores
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update scores from their company" ON employee_scores
    FOR UPDATE USING (company_id IN (
        SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert scores for their company" ON employee_scores
    FOR INSERT WITH CHECK (company_id IN (
        SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    ));

-- RLS policies for achievement_types (public read)
CREATE POLICY "Anyone can view achievement types" ON achievement_types
    FOR SELECT USING (true);

-- RLS policies for employee_achievements
CREATE POLICY "Users can view achievements from their company" ON employee_achievements
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert achievements for their company" ON employee_achievements
    FOR INSERT WITH CHECK (company_id IN (
        SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    ));

-- RLS policies for point_history
CREATE POLICY "Users can view point history from their company" ON point_history
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert point history for their company" ON point_history
    FOR INSERT WITH CHECK (company_id IN (
        SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    ));

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_employee_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for employee_scores
CREATE TRIGGER employee_scores_updated_at
    BEFORE UPDATE ON employee_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_scores_updated_at();

-- Insert default achievement types
INSERT INTO achievement_types (name, description, icon, points_reward, badge_color, requirements) VALUES
('Perfect Week', 'Llegar puntual toda la semana', '🏆', 50, 'gold', '{"type": "weekly", "required_days": 5, "max_late_minutes": 5}'),
('Early Bird', 'Llegar temprano 5 días seguidos', '🌅', 30, 'blue', '{"type": "streak", "required_days": 5, "early_minutes": 5}'),
('Punctuality Champion', 'Llegar puntual 10 días seguidos', '⭐', 75, 'purple', '{"type": "streak", "required_days": 10, "max_late_minutes": 5}'),
('Month Master', 'Asistencia perfecta por un mes', '📅', 100, 'diamond', '{"type": "monthly", "required_attendance": 100, "max_absences": 0}'),
('Improvement Star', 'Mejorar puntualidad 3 semanas seguidas', '📈', 40, 'green', '{"type": "improvement", "required_weeks": 3}'),
('Consistency King', 'Horario consistente por 2 semanas', '👑', 60, 'orange', '{"type": "consistency", "required_weeks": 2, "time_variance": 10}'),
('Zero Tardiness', 'Un mes sin tardanzas', '🎯', 80, 'red', '{"type": "monthly", "max_late_days": 0}');

-- Function to calculate points for attendance
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
        points := points - LEAST(10, p_late_minutes / 5); -- Lose 1 point per 5 minutes late, max 10
    END IF;
    
    -- Minimum 0 points
    RETURN GREATEST(0, points);
END;
$$ LANGUAGE plpgsql;

-- Function to update employee scores
CREATE OR REPLACE FUNCTION update_employee_score(
    p_employee_id UUID,
    p_company_id UUID,
    p_points_to_add INTEGER,
    p_reason VARCHAR(255),
    p_action_type VARCHAR(50)
) RETURNS VOID AS $$
BEGIN
    -- Insert or update employee score
    INSERT INTO employee_scores (employee_id, company_id, total_points, weekly_points, monthly_points)
    VALUES (p_employee_id, p_company_id, p_points_to_add, p_points_to_add, p_points_to_add)
    ON CONFLICT (employee_id) DO UPDATE SET
        total_points = employee_scores.total_points + p_points_to_add,
        weekly_points = employee_scores.weekly_points + p_points_to_add,
        monthly_points = employee_scores.monthly_points + p_points_to_add,
        updated_at = CURRENT_TIMESTAMP;
    
    -- Record in point history
    INSERT INTO point_history (employee_id, company_id, points_earned, reason, action_type)
    VALUES (p_employee_id, p_company_id, p_points_to_add, p_reason, p_action_type);
END;
$$ LANGUAGE plpgsql;

-- View for employee leaderboard
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

-- Grant permissions
GRANT ALL ON employee_scores TO authenticated;
GRANT ALL ON achievement_types TO authenticated;
GRANT ALL ON employee_achievements TO authenticated;
GRANT ALL ON point_history TO authenticated;
GRANT SELECT ON employee_leaderboard TO authenticated;
