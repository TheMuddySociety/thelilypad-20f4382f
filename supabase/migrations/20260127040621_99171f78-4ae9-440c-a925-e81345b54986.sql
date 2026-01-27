-- Create error logs table for tracking application errors
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component_name TEXT,
  component_stack TEXT,
  url TEXT,
  user_agent TEXT,
  user_id UUID,
  wallet_address TEXT,
  severity TEXT DEFAULT 'error',
  category TEXT DEFAULT 'unknown',
  metadata JSONB DEFAULT '{}',
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX idx_error_logs_is_resolved ON public.error_logs(is_resolved);
CREATE INDEX idx_error_logs_category ON public.error_logs(category);

-- Enable Row Level Security
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert errors (so errors can be logged even without auth)
CREATE POLICY "Anyone can log errors"
ON public.error_logs
FOR INSERT
WITH CHECK (true);

-- Only admins can view error logs
CREATE POLICY "Admins can view error logs"
ON public.error_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update error logs (for resolving)
CREATE POLICY "Admins can update error logs"
ON public.error_logs
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete error logs
CREATE POLICY "Admins can delete error logs"
ON public.error_logs
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));