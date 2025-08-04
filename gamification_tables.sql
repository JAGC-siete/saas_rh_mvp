-- Gamification System Tables
-- Run this directly in Supabase SQL Editor

-- Employee scores table
CREATE TABLE IF NOT EXISTS employee_scores (
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
CREATE TABLE IF NOT EXISTS achievement_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    points_reward INTEGER DEFAULT 0,
    badge_color VARCHAR(20) DEFAULT 'blue',
    requirements JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Employee achievements
CREATE TABLE IF NOT EXISTS employee_achievements (
    id SERIAL PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    achievement_type_id INTEGER NOT NULL REFERENCES achievement_types(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    points_earned INTEGER DEFAULT 0,
    UNIQUE(employee_id, achievement_type_id)
);

-- Point history for tracking
CREATE TABLE IF NOT EXISTS point_history (
    id SERIAL PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    points_earned INTEGER NOT NULL,
    reason VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    reference_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_scores_employee_id ON employee_scores(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_scores_company_id ON employee_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_achievements_employee_id ON employee_achievements(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_achievements_company_id ON employee_achievements(company_id);
CREATE INDEX IF NOT EXISTS idx_point_history_employee_id ON point_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_point_history_reference_date ON point_history(reference_date);

-- Insert default achievement types
INSERT INTO achievement_types (name, description, icon, points_reward, badge_color, requirements) VALUES
('Perfect Week', 'Complete 5 days of punctual attendance in a week', '🏆', 50, 'gold', '{"punctual_days": 5, "timeframe": "week"}'),
('Early Bird', 'Arrive early 3 times in a week', '🐦', 30, 'green', '{"early_arrivals": 3, "timeframe": "week"}'),
('Streak Master', 'Maintain 10 consecutive days of punctual attendance', '🔥', 100, 'red', '{"consecutive_days": 10}'),
('Perfect Month', 'Complete a full month without any tardiness', '👑', 200, 'purple', '{"punctual_days": 20, "timeframe": "month"}')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE employee_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_history ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (simplified for now)
CREATE POLICY "Users can view scores from their company" ON employee_scores
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Anyone can view achievement types" ON achievement_types
    FOR SELECT USING (true);

CREATE POLICY "Users can view achievements from their company" ON employee_achievements
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can view point history from their company" ON point_history
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )); 