-- Add media_type column to collections table
ALTER TABLE collections ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';

-- Create audio metadata table for music NFTs
CREATE TABLE collection_audio_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  artwork_id TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  cover_art_url TEXT NOT NULL,
  duration_seconds INTEGER,
  artist TEXT,
  album TEXT,
  track_number INTEGER,
  genre TEXT,
  bpm INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_collection_audio_metadata_collection_id ON collection_audio_metadata(collection_id);

-- Enable RLS
ALTER TABLE collection_audio_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view audio metadata"
  ON collection_audio_metadata FOR SELECT USING (true);

CREATE POLICY "Creators can insert their audio metadata"
  ON collection_audio_metadata FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM collections 
    WHERE collections.id = collection_audio_metadata.collection_id 
    AND collections.creator_id = auth.uid()
  ));

CREATE POLICY "Creators can update their audio metadata"
  ON collection_audio_metadata FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM collections 
    WHERE collections.id = collection_audio_metadata.collection_id 
    AND collections.creator_id = auth.uid()
  ));

CREATE POLICY "Creators can delete their audio metadata"
  ON collection_audio_metadata FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM collections 
    WHERE collections.id = collection_audio_metadata.collection_id 
    AND collections.creator_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all audio metadata"
  ON collection_audio_metadata FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_collection_audio_metadata_updated_at
  BEFORE UPDATE ON collection_audio_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create audio storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('collection-audio', 'collection-audio', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for audio bucket
CREATE POLICY "Anyone can view audio files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'collection-audio');

CREATE POLICY "Authenticated users can upload audio"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'collection-audio' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own audio"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'collection-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own audio"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'collection-audio' AND auth.uid()::text = (storage.foldername(name))[1]);