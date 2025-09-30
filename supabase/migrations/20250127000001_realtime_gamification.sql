-- Enable realtime for gamification tables
-- This migration adds real-time capabilities to the gamification system

-- 1. Enable realtime for gamification tables
ALTER PUBLICATION supabase_realtime ADD TABLE employee_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE employee_achievements;
ALTER PUBLICATION supabase_realtime ADD TABLE point_history;

-- 2. Function to notify score updates
CREATE OR REPLACE FUNCTION notify_score_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'score_update',
    json_build_object(
      'employee_id', NEW.employee_id,
      'company_id', NEW.company_id,
      'total_points', NEW.total_points,
      'weekly_points', NEW.weekly_points,
      'monthly_points', NEW.monthly_points,
      'punctuality_streak', NEW.punctuality_streak,
      'updated_at', NEW.updated_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to notify achievement unlocks
CREATE OR REPLACE FUNCTION notify_achievement_unlock()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'achievement_unlock',
    json_build_object(
      'employee_id', NEW.employee_id,
      'company_id', NEW.company_id,
      'achievement_type_id', NEW.achievement_type_id,
      'points_earned', NEW.points_earned,
      'earned_at', NEW.earned_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to notify leaderboard changes
CREATE OR REPLACE FUNCTION notify_leaderboard_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'leaderboard_update',
    json_build_object(
      'company_id', NEW.company_id,
      'employee_id', NEW.employee_id,
      'total_points', NEW.total_points,
      'rank_change', 'updated',
      'updated_at', NEW.updated_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to notify point history additions
CREATE OR REPLACE FUNCTION notify_point_history()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'point_history',
    json_build_object(
      'employee_id', NEW.employee_id,
      'company_id', NEW.company_id,
      'points_earned', NEW.points_earned,
      'reason', NEW.reason,
      'action_type', NEW.action_type,
      'created_at', NEW.created_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create triggers
CREATE TRIGGER score_update_trigger
  AFTER UPDATE ON employee_scores
  FOR EACH ROW
  EXECUTE FUNCTION notify_score_update();

CREATE TRIGGER achievement_unlock_trigger
  AFTER INSERT ON employee_achievements
  FOR EACH ROW
  EXECUTE FUNCTION notify_achievement_unlock();

CREATE TRIGGER leaderboard_change_trigger
  AFTER UPDATE ON employee_scores
  FOR EACH ROW
  EXECUTE FUNCTION notify_leaderboard_change();

CREATE TRIGGER point_history_trigger
  AFTER INSERT ON point_history
  FOR EACH ROW
  EXECUTE FUNCTION notify_point_history();

-- 7. Grant necessary permissions for realtime
GRANT SELECT ON employee_scores TO authenticated;
GRANT SELECT ON employee_achievements TO authenticated;
GRANT SELECT ON point_history TO authenticated;
GRANT SELECT ON achievement_types TO authenticated;

-- 8. Create indexes for better realtime performance
CREATE INDEX IF NOT EXISTS idx_employee_scores_company_id ON employee_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_scores_employee_id ON employee_scores(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_achievements_company_id ON employee_achievements(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_achievements_employee_id ON employee_achievements(employee_id);
CREATE INDEX IF NOT EXISTS idx_point_history_company_id ON point_history(company_id);
CREATE INDEX IF NOT EXISTS idx_point_history_employee_id ON point_history(employee_id);

-- 9. Create a view for realtime leaderboard data
CREATE OR REPLACE VIEW realtime_leaderboard AS
SELECT 
    es.employee_id,
    e.name,
    e.employee_code,
    es.total_points,
    es.weekly_points,
    es.monthly_points,
    es.punctuality_streak,
    es.company_id,
    RANK() OVER (PARTITION BY es.company_id ORDER BY es.total_points DESC) as total_rank,
    RANK() OVER (PARTITION BY es.company_id ORDER BY es.weekly_points DESC) as weekly_rank,
    RANK() OVER (PARTITION BY es.company_id ORDER BY es.monthly_points DESC) as monthly_rank,
    es.updated_at
FROM employee_scores es
JOIN employees e ON es.employee_id = e.id
WHERE e.status = 'active';

-- Enable realtime for the view
ALTER PUBLICATION supabase_realtime ADD TABLE realtime_leaderboard;

-- Grant permissions for the view
GRANT SELECT ON realtime_leaderboard TO authenticated;
