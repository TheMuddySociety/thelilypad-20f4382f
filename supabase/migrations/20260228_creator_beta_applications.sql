-- ============================================================
-- Creator Beta Program — Database Migration
-- Run this in Supabase SQL Editor
-- ============================================================
-- 1. Create the applications table
CREATE TABLE IF NOT EXISTS public.creator_beta_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Application fields
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (
        content_type IN ('streamer', 'artist', 'musician', 'other')
    ),
    portfolio_urls TEXT [] DEFAULT '{}',
    social_links JSONB DEFAULT '{}'::jsonb,
    motivation TEXT,
    -- Status workflow
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'reviewing',
            'interview_scheduled',
            'approved',
            'rejected'
        )
    ),
    -- Interview fields
    interview_room_id TEXT UNIQUE,
    interview_scheduled_at TIMESTAMPTZ,
    interview_notes TEXT,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    -- One active application per user
    UNIQUE(user_id)
);
-- 2. Auto-update updated_at
CREATE OR REPLACE FUNCTION update_creator_app_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_creator_app_updated_at BEFORE
UPDATE ON public.creator_beta_applications FOR EACH ROW EXECUTE PROCEDURE update_creator_app_updated_at();
-- 3. Enable RLS
ALTER TABLE public.creator_beta_applications ENABLE ROW LEVEL SECURITY;
-- Users can view their own application
CREATE POLICY "Users can view own application" ON public.creator_beta_applications FOR
SELECT USING (auth.uid() = user_id);
-- Users can submit one application
CREATE POLICY "Users can submit application" ON public.creator_beta_applications FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- Users can update their own pending application
CREATE POLICY "Users can update pending application" ON public.creator_beta_applications FOR
UPDATE USING (
        auth.uid() = user_id
        AND status IN ('pending', 'reviewing')
    );
-- Admins can read all applications
CREATE POLICY "Admins can view all applications" ON public.creator_beta_applications FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.user_roles
            WHERE user_id = auth.uid()
                AND role = 'admin'
        )
    );
-- Admins can update any application
CREATE POLICY "Admins can update all applications" ON public.creator_beta_applications FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM public.user_roles
            WHERE user_id = auth.uid()
                AND role = 'admin'
        )
    );
-- 4. Indexes for admin queries
CREATE INDEX IF NOT EXISTS idx_creator_apps_status ON public.creator_beta_applications(status);
CREATE INDEX IF NOT EXISTS idx_creator_apps_user ON public.creator_beta_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_apps_created ON public.creator_beta_applications(created_at DESC);
-- 5. Atomic promotion function
CREATE OR REPLACE FUNCTION promote_to_creator(p_application_id UUID, p_admin_id UUID) RETURNS VOID AS $$ BEGIN -- Update application status
UPDATE public.creator_beta_applications
SET status = 'approved',
    reviewed_by = p_admin_id,
    reviewed_at = now()
WHERE id = p_application_id;
-- Set is_creator on user_profiles
UPDATE public.user_profiles
SET is_creator = true
WHERE user_id = (
        SELECT user_id
        FROM public.creator_beta_applications
        WHERE id = p_application_id
    );
-- Create streamer_profiles entry if not exists
INSERT INTO public.streamer_profiles (user_id, display_name)
SELECT user_id,
    display_name
FROM public.creator_beta_applications
WHERE id = p_application_id ON CONFLICT (user_id) DO NOTHING;
-- Send notification
INSERT INTO public.notifications (user_id, type, title, message, link)
SELECT user_id,
    'creator_approved',
    '🎉 Welcome to the Creator Program!',
    'Your application has been approved. You can now create collections and start streaming.',
    '/dashboard'
FROM public.creator_beta_applications
WHERE id = p_application_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;