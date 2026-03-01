-- ============================================================
-- Creator Beta Program — Production-Ready Database Migration
-- ============================================================
-- Merged schema: combines Grok's recommended patterns with the
-- additional columns required by the frontend (CreatorApply.tsx,
-- CreatorApplicationsManager.tsx, InterviewRoom.tsx).
--
-- Run in Supabase SQL Editor (or via Supabase CLI migration).
-- ============================================================
-- -----------------------------------------------
-- 1. Create the table
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_beta_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Application status (CHECK constraint = lightweight enum)
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'reviewing',
            'interview_scheduled',
            'approved',
            'rejected'
        )
    ),
    -- Core application data (used by /creator/apply form)
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (
        content_type IN ('streamer', 'artist', 'musician', 'other')
    ),
    portfolio_urls TEXT [] NOT NULL DEFAULT '{}',
    social_links JSONB DEFAULT '{}'::jsonb,
    motivation TEXT,
    -- Interview fields (used by admin + /interview/:id page)
    interview_room_id TEXT UNIQUE,
    -- e.g. 'thelilypad-interview-abc123xyz'
    interview_scheduled_at TIMESTAMPTZ,
    -- when the interview is scheduled
    interview_notes TEXT,
    -- notes visible to admin during interview
    admin_notes TEXT,
    -- internal admin comments (never visible to applicant)
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    reviewed_by UUID REFERENCES auth.users(id),
    -- admin who reviewed
    reviewed_at TIMESTAMPTZ,
    -- when decision was made
    -- One active application per user
    CONSTRAINT unique_user_application UNIQUE (user_id)
);
-- -----------------------------------------------
-- 2. Auto-update updated_at trigger
-- -----------------------------------------------
-- Generic function name so it can be reused for other tables
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_update_creator_apps_updated_at BEFORE
UPDATE ON public.creator_beta_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- -----------------------------------------------
-- 3. Enable Row Level Security
-- -----------------------------------------------
ALTER TABLE public.creator_beta_applications ENABLE ROW LEVEL SECURITY;
-- -----------------------------------------------
-- 4. RLS Policies — Secure & Granular
-- -----------------------------------------------
-- Applicants can VIEW their own application
CREATE POLICY "Applicants view own application" ON public.creator_beta_applications FOR
SELECT USING (auth.uid() = user_id);
-- Applicants can INSERT their own application
CREATE POLICY "Applicants create own application" ON public.creator_beta_applications FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- Applicants can UPDATE their own application (only while pending/reviewing)
CREATE POLICY "Applicants update pending application" ON public.creator_beta_applications FOR
UPDATE USING (
        auth.uid() = user_id
        AND status IN ('pending', 'reviewing')
    ) WITH CHECK (
        auth.uid() = user_id
        AND status IN ('pending', 'reviewing')
    );
-- Admins have full access (uses user_roles table, matching existing codebase pattern)
CREATE POLICY "Admins have full access to applications" ON public.creator_beta_applications FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
            AND role = 'admin'
    )
) WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
            AND role = 'admin'
    )
);
-- -----------------------------------------------
-- 5. Indexes for performance
-- -----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_creator_apps_user_id ON public.creator_beta_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_apps_status ON public.creator_beta_applications(status);
CREATE INDEX IF NOT EXISTS idx_creator_apps_created_at ON public.creator_beta_applications(created_at DESC);
-- -----------------------------------------------
-- 6. Atomic promotion RPC (called by admin "Approve" button)
-- -----------------------------------------------
-- SECURITY DEFINER = runs with table owner privileges,
-- so the admin doesn't need direct UPDATE on user_profiles/streamer_profiles.
CREATE OR REPLACE FUNCTION public.promote_to_creator(p_application_id UUID, p_admin_id UUID) RETURNS VOID AS $$
DECLARE v_user_id UUID;
v_display_name TEXT;
BEGIN -- Get applicant info
SELECT user_id,
    display_name INTO v_user_id,
    v_display_name
FROM public.creator_beta_applications
WHERE id = p_application_id;
IF v_user_id IS NULL THEN RAISE EXCEPTION 'Application not found: %',
p_application_id;
END IF;
-- 1) Mark application as approved
UPDATE public.creator_beta_applications
SET status = 'approved',
    reviewed_by = p_admin_id,
    reviewed_at = now()
WHERE id = p_application_id;
-- 2) Set is_creator flag on user_profiles
UPDATE public.user_profiles
SET is_creator = true
WHERE user_id = v_user_id;
-- 3) Create streamer_profiles entry (idempotent via ON CONFLICT)
INSERT INTO public.streamer_profiles (user_id, display_name)
VALUES (v_user_id, v_display_name) ON CONFLICT (user_id) DO NOTHING;
-- 4) Send welcome notification
INSERT INTO public.notifications (user_id, type, title, message, link)
VALUES (
        v_user_id,
        'creator_approved',
        '🎉 Welcome to the Creator Program!',
        'Your application has been approved. You can now create collections and start streaming.',
        '/dashboard'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;