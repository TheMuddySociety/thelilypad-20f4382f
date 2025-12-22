-- Allow clip owners to update report status on their clips' comments
CREATE POLICY "Clip owners can update reports on their clips"
ON public.comment_reports
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.clip_comments cc
        JOIN public.clips c ON cc.clip_id = c.id
        WHERE cc.id = comment_reports.comment_id
        AND c.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.clip_comments cc
        JOIN public.clips c ON cc.clip_id = c.id
        WHERE cc.id = comment_reports.comment_id
        AND c.user_id = auth.uid()
    )
);