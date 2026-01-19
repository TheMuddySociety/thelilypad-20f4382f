-- Security & Monitoring Migration: Rate Limiting and Audit Logging
-- Created: 2026-01-19

-- ============================================================================
-- 1. RATE LIMITING INFRASTRUCTURE
-- ============================================================================

-- Table to track stream creation rate limits per user
CREATE TABLE IF NOT EXISTS public.stream_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  streams_created_count INTEGER DEFAULT 0,
  last_stream_at TIMESTAMP WITH TIME ZONE,
  daily_limit INTEGER DEFAULT 10,
  hourly_limit INTEGER DEFAULT 3,
  last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_stream_rate_limits_user_id ON public.stream_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_rate_limits_last_reset ON public.stream_rate_limits(last_reset_at);

-- Function to reset daily counters
CREATE OR REPLACE FUNCTION reset_daily_stream_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.stream_rate_limits
  SET 
    streams_created_count = 0,
    last_reset_at = now()
  WHERE last_reset_at < (now() - INTERVAL '24 hours');
END;
$$;

-- Function to check and enforce rate limits
CREATE OR REPLACE FUNCTION check_stream_rate_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_daily_count INTEGER;
  v_hourly_count INTEGER;
  v_daily_limit INTEGER;
  v_hourly_limit INTEGER;
  v_last_reset TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current limits
  SELECT 
    streams_created_count,
    daily_limit,
    hourly_limit,
    last_reset_at
  INTO 
    v_daily_count,
    v_daily_limit,
    v_hourly_limit,
    v_last_reset
  FROM public.stream_rate_limits
  WHERE user_id = p_user_id;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.stream_rate_limits (user_id, streams_created_count)
    VALUES (p_user_id, 0);
    RETURN TRUE;
  END IF;
  
  -- Reset if 24 hours have passed
  IF v_last_reset < (now() - INTERVAL '24 hours') THEN
    UPDATE public.stream_rate_limits
    SET 
      streams_created_count = 0,
      last_reset_at = now()
    WHERE user_id = p_user_id;
    RETURN TRUE;
  END IF;
  
  -- Check hourly limit (count streams in last hour)
  SELECT COUNT(*) INTO v_hourly_count
  FROM public.streams
  WHERE user_id = p_user_id
    AND created_at > (now() - INTERVAL '1 hour');
  
  IF v_hourly_count >= v_hourly_limit THEN
    RETURN FALSE;
  END IF;
  
  -- Check daily limit
  IF v_daily_count >= v_daily_limit THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to increment stream counter
CREATE OR REPLACE FUNCTION increment_stream_counter(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.stream_rate_limits (user_id, streams_created_count, last_stream_at)
  VALUES (p_user_id, 1, now())
  ON CONFLICT (user_id) DO UPDATE
  SET 
    streams_created_count = stream_rate_limits.streams_created_count + 1,
    last_stream_at = now(),
    updated_at = now();
END;
$$;

-- Trigger to enforce rate limits on stream creation
CREATE OR REPLACE FUNCTION enforce_stream_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is within rate limits
  IF NOT check_stream_rate_limit(NEW.user_id) THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before creating another stream.'
      USING HINT = 'You can create up to 3 streams per hour and 10 streams per day.';
  END IF;
  
  -- Increment counter
  PERFORM increment_stream_counter(NEW.user_id);
  
  RETURN NEW;
END;
$$;

-- Apply trigger to streams table
DROP TRIGGER IF EXISTS trigger_enforce_stream_rate_limit ON public.streams;
CREATE TRIGGER trigger_enforce_stream_rate_limit
  BEFORE INSERT ON public.streams
  FOR EACH ROW
  EXECUTE FUNCTION enforce_stream_rate_limit();

-- ============================================================================
-- 2. AUDIT LOGGING INFRASTRUCTURE
-- ============================================================================

-- Table to log all stream-related security events
CREATE TABLE IF NOT EXISTS public.stream_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID REFERENCES public.streams(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'start', 'stop', 'permission_denied', etc.
  event_type TEXT NOT NULL, -- 'security', 'performance', 'user_action', 'system'
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_stream_audit_logs_stream_id ON public.stream_audit_logs(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_audit_logs_user_id ON public.stream_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_audit_logs_action ON public.stream_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_stream_audit_logs_event_type ON public.stream_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_stream_audit_logs_severity ON public.stream_audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_stream_audit_logs_created_at ON public.stream_audit_logs(created_at);

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_stream_audit(
  p_stream_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_event_type TEXT,
  p_severity TEXT DEFAULT 'info',
  p_details JSONB DEFAULT '{}'::jsonb,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.stream_audit_logs (
    stream_id,
    user_id,
    action,
    event_type,
    severity,
    details,
    metadata
  ) VALUES (
    p_stream_id,
    p_user_id,
    p_action,
    p_event_type,
    p_severity,
    p_details,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Function to log stream creation
CREATE OR REPLACE FUNCTION log_stream_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM log_stream_audit(
    NEW.id,
    NEW.user_id,
    'create_stream',
    'user_action',
    'info',
    jsonb_build_object(
      'title', NEW.title,
      'category', NEW.category,
      'is_live', NEW.is_live
    )
  );
  
  RETURN NEW;
END;
$$;

-- Function to log stream updates
CREATE OR REPLACE FUNCTION log_stream_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM log_stream_audit(
    NEW.id,
    NEW.user_id,
    'update_stream',
    'user_action',
    'info',
    jsonb_build_object(
      'old_is_live', OLD.is_live,
      'new_is_live', NEW.is_live,
      'old_title', OLD.title,
      'new_title', NEW.title
    )
  );
  
  RETURN NEW;
END;
$$;

-- Function to log stream deletion
CREATE OR REPLACE FUNCTION log_stream_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM log_stream_audit(
    OLD.id,
    OLD.user_id,
    'delete_stream',
    'user_action',
    'warning',
    jsonb_build_object(
      'title', OLD.title,
      'total_views', OLD.total_views,
      'duration_seconds', OLD.duration_seconds
    )
  );
  
  RETURN OLD;
END;
$$;

-- Apply audit logging triggers
DROP TRIGGER IF EXISTS trigger_log_stream_creation ON public.streams;
CREATE TRIGGER trigger_log_stream_creation
  AFTER INSERT ON public.streams
  FOR EACH ROW
  EXECUTE FUNCTION log_stream_creation();

DROP TRIGGER IF EXISTS trigger_log_stream_update ON public.streams;
CREATE TRIGGER trigger_log_stream_update
  AFTER UPDATE ON public.streams
  FOR EACH ROW
  WHEN (OLD.is_live IS DISTINCT FROM NEW.is_live OR OLD.title IS DISTINCT FROM NEW.title)
  EXECUTE FUNCTION log_stream_update();

DROP TRIGGER IF EXISTS trigger_log_stream_deletion ON public.streams;
CREATE TRIGGER trigger_log_stream_deletion
  BEFORE DELETE ON public.streams
  FOR EACH ROW
  EXECUTE FUNCTION log_stream_deletion();

-- ============================================================================
-- 3. ENHANCED RLS POLICIES
-- ============================================================================

-- Enable RLS on audit logs (read-only for users, write for system)
ALTER TABLE public.stream_audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit logs
CREATE POLICY "Users can view their own stream audit logs"
ON public.stream_audit_logs FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all audit logs
CREATE POLICY "Admins can view all stream audit logs"
ON public.stream_audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
);

-- System can insert audit logs (via triggers and functions)
CREATE POLICY "System can insert audit logs"
ON public.stream_audit_logs FOR INSERT
WITH CHECK (true);

-- Enable RLS on rate limits
ALTER TABLE public.stream_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can view their own rate limits
CREATE POLICY "Users can view their own rate limits"
ON public.stream_rate_limits FOR SELECT
USING (auth.uid() = user_id);

-- System can manage rate limits
CREATE POLICY "System can manage rate limits"
ON public.stream_rate_limits FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 4. CLEANUP AND MAINTENANCE
-- ============================================================================

-- Function to cleanup old audit logs (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.stream_audit_logs
  WHERE created_at < (now() - INTERVAL '90 days');
END;
$$;

-- Function to get user's current rate limit status
CREATE OR REPLACE FUNCTION get_stream_rate_limit_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_hourly_count INTEGER;
  v_daily_count INTEGER;
  v_hourly_limit INTEGER := 3;
  v_daily_limit INTEGER := 10;
BEGIN
  -- Get daily count
  SELECT streams_created_count INTO v_daily_count
  FROM public.stream_rate_limits
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    v_daily_count := 0;
  END IF;
  
  -- Get hourly count
  SELECT COUNT(*) INTO v_hourly_count
  FROM public.streams
  WHERE user_id = p_user_id
    AND created_at > (now() - INTERVAL '1 hour');
  
  v_result := jsonb_build_object(
    'user_id', p_user_id,
    'hourly_count', v_hourly_count,
    'hourly_limit', v_hourly_limit,
    'hourly_remaining', v_hourly_limit - v_hourly_count,
    'daily_count', v_daily_count,
    'daily_limit', v_daily_limit,
    'daily_remaining', v_daily_limit - v_daily_count,
    'can_create_stream', check_stream_rate_limit(p_user_id)
  );
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- 5. GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION check_stream_rate_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_stream_rate_limit_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION log_stream_audit(UUID, UUID, TEXT, TEXT, TEXT, JSONB, JSONB) TO authenticated;

-- Grant execute on maintenance functions to service role only
GRANT EXECUTE ON FUNCTION reset_daily_stream_limits() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs() TO service_role;

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.stream_rate_limits IS 'Tracks rate limiting for stream creation per user';
COMMENT ON TABLE public.stream_audit_logs IS 'Audit log for all stream-related security events';
COMMENT ON FUNCTION check_stream_rate_limit(UUID) IS 'Checks if user can create a new stream based on rate limits';
COMMENT ON FUNCTION get_stream_rate_limit_status(UUID) IS 'Returns current rate limit status for a user';
COMMENT ON FUNCTION log_stream_audit(UUID, UUID, TEXT, TEXT, TEXT, JSONB, JSONB) IS 'Logs a stream audit event';
