

# Audit Fix: Solana Music NFTs with Metaplex Core

## Issues Found

1. **Audio files never uploaded to Arweave** — The deploy handler (line 282-287) only passes `track.coverFile` as the asset file. The actual audio (`track.audioFile`) is completely ignored, meaning minted Music NFTs have no playable audio on-chain.

2. **Missing `animation_url` in metadata** — Metaplex Core Music NFTs require `animation_url` pointing to the audio file. The current `buildMetadata` callback only produces `image` from the cover art — no audio URI is included.

3. **Music attributes not formatted as NFT attributes** — Fields like `artist`, `genre`, `bpm`, `duration` are passed as flat metadata keys. The Metaplex standard expects them as `attributes: [{ trait_type: "Artist", value: "..." }]`.

4. **Music mode uses wrong step config** — Line 133: `mode === "music"` falls through to `launchpadConfig.modes.basic` instead of `launchpadConfig.modes.music`. The dedicated 5-step music flow is never used.

5. **No `collection_audio_metadata` insert after deploy** — The DB table `collection_audio_metadata` exists (with `audio_url`, `cover_art_url`, `artist`, `bpm`, `duration_seconds`) but the deploy flow never populates it, so the Music Store and Playlist features can't find any tracks.

6. **No `animation_url` support in `uploadBatchToArweave`** — The batch upload function handles image + thumbnail but has no mechanism for a secondary file (audio) per item.

---

## Plan

### 1. Fix music step config in LaunchpadCreate.tsx

Change line 133-135 so `mode === "music"` reads from `launchpadConfig.modes.music` (the dedicated 5-step flow) instead of falling through to `basic`.

### 2. Upload audio files to Arweave alongside cover art

Modify the music branch of `handleDeploy` (lines 282-287) to:
- Upload each `track.audioFile` to Arweave first (using `uploadToArweave` individually or a new batch path)
- Pass the resulting audio URI into `buildMetadata` as `animation_url`
- Continue uploading cover images via the existing batch pipeline

Specifically, before the batch upload call, loop through tracks and upload audio files:
```
for each track:
  audioUri = await uploadToArweave(track.audioFile, wallet, tags)
  store audioUri in a map keyed by track index
```

Then in `buildMetadata`, inject `animation_url: audioUriMap[idx]`.

### 3. Format music metadata as Metaplex-standard attributes

Transform the flat `MusicMetadata` fields into the `attributes` array format:
```json
{
  "name": "Track Name",
  "description": "...",
  "image": "<cover arweave uri>",
  "animation_url": "<audio arweave uri>",
  "attributes": [
    { "trait_type": "Artist", "value": "Artist Name" },
    { "trait_type": "Genre", "value": "Electronic" },
    { "trait_type": "BPM", "value": "128" },
    { "trait_type": "Duration", "value": "234" },
    { "trait_type": "Album", "value": "Album Name" },
    { "trait_type": "Track Number", "value": "1" }
  ],
  "properties": {
    "category": "audio",
    "files": [
      { "uri": "<audio uri>", "type": "audio/mpeg" },
      { "uri": "<cover uri>", "type": "image/png" }
    ]
  }
}
```

Create a helper `buildMusicNftMetadata(track, imageUri, audioUri)` in a new file `src/lib/musicMetadata.ts`.

### 4. Insert `collection_audio_metadata` rows after successful deploy

After the Solana deploy succeeds and `itemLinks` are available, insert rows into `collection_audio_metadata` for each track with:
- `collection_id`, `artwork_id` (token index), `audio_url` (Arweave audio URI), `cover_art_url` (Arweave image URI), `artist`, `bpm`, `duration_seconds`, `genre`

This enables the Music Store, Playlist, and MiniPlayer to find and play the tracks.

### 5. Add progress feedback for audio uploads

Since audio files are larger than images, add a separate toast stage: `"Uploading audio tracks to Arweave..."` before the cover art batch upload begins.

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/LaunchpadCreate.tsx` | Fix music step config; upload audio files; build proper metadata; insert `collection_audio_metadata` rows |
| `src/lib/musicMetadata.ts` | New — `buildMusicNftMetadata()` helper |

