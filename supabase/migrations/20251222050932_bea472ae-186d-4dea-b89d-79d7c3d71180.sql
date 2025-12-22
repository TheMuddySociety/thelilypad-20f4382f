-- Create comment_reports table
CREATE TABLE public.comment_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id uuid REFERENCES public.clip_comments(id) ON DELETE CASCADE NOT NULL,
    reporter_id uuid NOT NULL,
    reason text NOT NULL,
    details text,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(comment_id, reporter_id)
);

-- Enable RLS
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports"
ON public.comment_reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
ON public.comment_reports
FOR SELECT
USING (auth.uid() = reporter_id);

-- Clip owners can view reports on their clips' comments
CREATE POLICY "Clip owners can view reports on their clips"
ON public.comment_reports
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.clip_comments cc
        JOIN public.clips c ON cc.clip_id = c.id
        WHERE cc.id = comment_reports.comment_id
        AND c.user_id = auth.uid()
    )
);