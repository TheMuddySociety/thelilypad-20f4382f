-- Add soft delete columns to collections table
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS scheduled_permanent_delete_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient querying of non-deleted collections
CREATE INDEX IF NOT EXISTS idx_collections_deleted_at ON public.collections(deleted_at) WHERE deleted_at IS NULL;

-- Create index for cleanup job to find expired collections
CREATE INDEX IF NOT EXISTS idx_collections_scheduled_delete ON public.collections(scheduled_permanent_delete_at) WHERE scheduled_permanent_delete_at IS NOT NULL;