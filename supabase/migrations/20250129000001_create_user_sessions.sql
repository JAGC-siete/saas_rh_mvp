-- Migration: Create user_sessions table for 90 min idle timeout
-- Date: 2025-01-29
-- Description: Track user sessions with last_activity for idle timeout enforcement

-- Session metadata table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL, -- jti from JWT
  device_id TEXT,
  ip_hash TEXT,
  ua_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL, -- When session should expire
  idle_timeout_at TIMESTAMPTZ NOT NULL, -- When to enforce 90 min timeout
  revoked_at TIMESTAMPTZ,
  company_id UUID REFERENCES companies(id),
  tenant_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Constraints
  CONSTRAINT valid_times CHECK (last_activity <= NOW() + INTERVAL '1 day'),
  CONSTRAINT future_expires CHECK (expires_at > created_at)
);

-- Indexes for performance
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(last_activity) WHERE revoked_at IS NULL;
CREATE INDEX idx_user_sessions_idle_check ON user_sessions(idle_timeout_at) WHERE revoked_at IS NULL;
CREATE INDEX idx_user_sessions_company ON user_sessions(company_id) WHERE revoked_at IS NULL;

-- RLS policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all sessions
CREATE POLICY "Service role manages all sessions" ON user_sessions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Function to update last_activity (rate-limited)
CREATE OR REPLACE FUNCTION update_session_activity(
  p_session_token TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_last_activity TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
  v_threshold INTERVAL := INTERVAL '60 seconds'; -- Rate limit: only update every 60s
BEGIN
  -- Find session
  SELECT last_activity INTO v_last_activity
  FROM user_sessions
  WHERE session_token = p_session_token
    AND revoked_at IS NULL
    AND (p_user_id IS NULL OR user_id = p_user_id);
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if session already expired (idle timeout)
  IF (SELECT idle_timeout_at FROM user_sessions WHERE session_token = p_session_token) < v_now THEN
    -- Session expired by idle timeout
    UPDATE user_sessions
    SET revoked_at = v_now,
        metadata = metadata || jsonb_build_object('revocation_reason', 'idle_timeout_90m')
    WHERE session_token = p_session_token;
    RETURN FALSE;
  END IF;
  
  -- Rate-limit updates (only if > 60s since last update)
  IF v_now - v_last_activity >= v_threshold THEN
    UPDATE user_sessions
    SET 
      last_activity = v_now,
      idle_timeout_at = v_now + INTERVAL '90 minutes'
    WHERE session_token = p_session_token;
    RETURN TRUE;
  END IF;
  
  RETURN TRUE; -- Session still valid, but no update needed
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create new session
CREATE OR REPLACE FUNCTION create_user_session(
  p_user_id UUID,
  p_session_token TEXT,
  p_device_id TEXT DEFAULT NULL,
  p_ip_hash TEXT DEFAULT NULL,
  p_ua_hash TEXT DEFAULT NULL,
  p_company_id UUID DEFAULT NULL,
  p_access_token_ttl_seconds INTEGER DEFAULT 3600,
  p_idle_timeout_minutes INTEGER DEFAULT 90
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO user_sessions (
    user_id,
    session_token,
    device_id,
    ip_hash,
    ua_hash,
    last_activity,
    expires_at,
    idle_timeout_at,
    company_id
  ) VALUES (
    p_user_id,
    p_session_token,
    p_device_id,
    p_ip_hash,
    p_ua_hash,
    v_now,
    v_now + (p_access_token_ttl_seconds || ' seconds')::INTERVAL,
    v_now + (p_idle_timeout_minutes || ' minutes')::INTERVAL,
    p_company_id
  ) RETURNING id INTO v_session_id;
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if session is valid (not idle)
CREATE OR REPLACE FUNCTION is_session_active(
  p_session_token TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_idle_timeout_at TIMESTAMPTZ;
BEGIN
  SELECT idle_timeout_at INTO v_idle_timeout_at
  FROM user_sessions
  WHERE session_token = p_session_token
    AND revoked_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if session expired by idle timeout
  IF v_idle_timeout_at < NOW() THEN
    -- Mark as revoked
    UPDATE user_sessions
    SET 
      revoked_at = NOW(),
      metadata = metadata || jsonb_build_object('revocation_reason', 'idle_timeout_90m')
    WHERE session_token = p_session_token;
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke session
CREATE OR REPLACE FUNCTION revoke_user_session(
  p_session_token TEXT,
  p_reason TEXT DEFAULT 'manual'
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_sessions
  SET 
    revoked_at = NOW(),
    metadata = metadata || jsonb_build_object('revocation_reason', p_reason)
  WHERE session_token = p_session_token
    AND revoked_at IS NULL;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke all user sessions (for logout all devices)
CREATE OR REPLACE FUNCTION revoke_all_user_sessions(
  p_user_id UUID,
  p_exclude_token TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE user_sessions
  SET 
    revoked_at = NOW(),
    metadata = metadata || jsonb_build_object('revocation_reason', 'logout_all')
  WHERE user_id = p_user_id
    AND revoked_at IS NULL
    AND (p_exclude_token IS NULL OR session_token != p_exclude_token);
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired sessions (call via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE user_sessions
  SET revoked_at = NOW()
  WHERE (expires_at < NOW() OR idle_timeout_at < NOW())
    AND revoked_at IS NULL;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Optional: Delete old revoked sessions
  DELETE FROM user_sessions
  WHERE revoked_at IS NOT NULL
    AND revoked_at < NOW() - INTERVAL '30 days';
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION update_session_activity TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_session TO authenticated;
GRANT EXECUTE ON FUNCTION is_session_active TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_user_session TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_all_user_sessions TO authenticated;

