-- Update collections status constraint to allow draft, active, and minted statuses
ALTER TABLE public.collections DROP CONSTRAINT IF EXISTS collections_status_check;
ALTER TABLE public.collections
ADD CONSTRAINT collections_status_check CHECK (
        status IN (
            'draft',
            'upcoming',
            'active',
            'live',
            'ended',
            'minted'
        )
    );