
-- Admin RLS policies using has_role function
CREATE POLICY "Admins can view all applications" ON public.creator_beta_applications
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update applications" ON public.creator_beta_applications
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin')
  );

-- promote_to_creator RPC function
CREATE OR REPLACE FUNCTION public.promote_to_creator(p_application_id UUID, p_admin_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Verify admin
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Get applicant user_id
  SELECT user_id INTO v_user_id FROM public.creator_beta_applications WHERE id = p_application_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Update application status
  UPDATE public.creator_beta_applications
  SET status = 'approved', reviewed_by = p_admin_id, reviewed_at = now(), updated_at = now()
  WHERE id = p_application_id;

  -- Promote user to creator
  UPDATE public.user_profiles
  SET is_creator = true, updated_at = now()
  WHERE user_id = v_user_id;

  -- Send notification
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (v_user_id, 'creator_approved', '🎉 Creator Status Approved!', 'Congratulations! You are now a verified creator on The Lily Pad. Start creating!', '/launchpad');
END;
$$;
