import { MusicTrack } from '@/components/launchpad/MusicMetadataEditor';

/**
 * Build Metaplex-standard NFT metadata for a Music NFT.
 * Includes animation_url for the audio, structured attributes, and
 * properties.files with correct MIME types.
 */
export function buildMusicNftMetadata(
  track: MusicTrack,
  imageUri: string,
  audioUri: string,
  collectionName?: string
) {
  const { metadata } = track;
  const audioMime = getAudioMimeType(track.audioFile.name);
  const imageMime = getImageMimeType(track.coverFile.name);

  const attributes: { trait_type: string; value: string }[] = [];

  if (metadata.artist) {
    attributes.push({ trait_type: 'Artist', value: metadata.artist });
  }
  if (metadata.genre) {
    attributes.push({ trait_type: 'Genre', value: metadata.genre });
  }
  if (metadata.bpm != null) {
    attributes.push({ trait_type: 'BPM', value: String(metadata.bpm) });
  }
  if (metadata.durationSeconds != null) {
    attributes.push({ trait_type: 'Duration', value: String(metadata.durationSeconds) });
  }
  if (metadata.album) {
    attributes.push({ trait_type: 'Album', value: metadata.album });
  }
  if (metadata.trackNumber != null) {
    attributes.push({ trait_type: 'Track Number', value: String(metadata.trackNumber) });
  }

  return {
    name: metadata.name || 'Untitled Track',
    description: metadata.description || '',
    image: imageUri,
    animation_url: audioUri,
    attributes,
    properties: {
      category: 'audio',
      files: [
        { uri: audioUri, type: audioMime },
        { uri: imageUri, type: imageMime },
      ],
    },
    ...(collectionName ? { collection: { name: collectionName } } : {}),
  };
}

function getAudioMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'wav': return 'audio/wav';
    case 'flac': return 'audio/flac';
    case 'ogg': return 'audio/ogg';
    case 'aac': return 'audio/aac';
    case 'm4a': return 'audio/mp4';
    default: return 'audio/mpeg';
  }
}

function getImageMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'svg': return 'image/svg+xml';
    default: return 'image/png';
  }
}
