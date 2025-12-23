# Content Moderation

The Lily Pad includes AI-powered content moderation for NFT collections to ensure a safe platform.

## Overview

All uploaded trait images are scanned for inappropriate content before being approved for use in collections.

## Moderation Categories

| Category | Description |
|----------|-------------|
| `nsfw` | Adult/sexual content |
| `violence` | Violent imagery |
| `hate_speech` | Discriminatory content |
| `spam` | Repetitive/low-quality |
| `harassment` | Targeted abuse |
| `illegal` | Illegal activities |
| `clean` | Safe content |

## Moderation Flow

```
Upload Image → Generate Hash → Check Cache
      ↓              ↓
   [Cache Hit] → Return Cached Result
      ↓
   [Cache Miss] → AI Scan → Store Result
      ↓
   Auto-Approve/Reject → Manual Review (if needed)
```

## Bulk Trait Uploader

The `BulkTraitUploader` component handles moderation during upload:

### Features

- **Concurrent Scanning**: Adjustable 1-10 images at once
- **Scan Caching**: Skip re-scanning identical images
- **Progress Tracking**: Real-time scan progress
- **Clear Cache**: Reset for re-verification

### Configuration

```tsx
<BulkTraitUploader
  onFilesProcessed={(files) => handleFiles(files)}
  maxConcurrency={5}
/>
```

### Concurrency Slider

```tsx
<Slider
  value={[concurrencyLimit]}
  onValueChange={(value) => setConcurrencyLimit(value[0])}
  min={1}
  max={10}
  step={1}
/>
```

## Scan Caching

### How It Works

1. Generate SHA-256 hash of image
2. Check cache for existing result
3. If cached and approved, skip scan
4. If not cached, perform scan and store

### Implementation

```typescript
interface ScanCacheEntry {
  isApproved: boolean;
  scanTime: number;
  reasons?: string[];
}

const scanCache = new Map<string, ScanCacheEntry>();

const generateFileHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
```

### Cache Display

```tsx
{cacheHits > 0 && (
  <Badge variant="outline">
    {cacheHits} cached
  </Badge>
  <Button onClick={clearCache}>
    Clear
  </Button>
)}
```

## Edge Function

### API Endpoint

```
POST /functions/v1/content-moderation
```

### Request

```typescript
{
  content_type: "image",
  content_url?: string,
  content_base64?: string
}
```

### Response

```typescript
{
  is_safe: boolean,
  score: number,
  reasons: string[],
  details?: {
    nsfw_score: number,
    violence_score: number,
    // ...
  }
}
```

### Implementation

```typescript
// supabase/functions/content-moderation/index.ts
serve(async (req) => {
  const { content_type, content_url, content_base64 } = await req.json();
  
  // Call AI moderation service
  const result = await moderateContent({
    type: content_type,
    url: content_url,
    base64: content_base64,
  });
  
  return new Response(JSON.stringify({
    is_safe: result.score < 0.5,
    score: result.score,
    reasons: result.flagged_categories,
  }));
});
```

## Database Schema

```sql
-- Moderation queue
CREATE TABLE moderation_queue (
  id UUID PRIMARY KEY,
  content_type moderation_content_type,
  content_url TEXT,
  content_text TEXT,
  ai_score DECIMAL,
  ai_reasons moderation_reason[],
  ai_details JSONB,
  status moderation_status DEFAULT 'pending',
  submitted_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- Moderation actions log
CREATE TABLE moderation_actions (
  id UUID PRIMARY KEY,
  queue_id UUID REFERENCES moderation_queue,
  action_type TEXT,
  previous_status moderation_status,
  new_status moderation_status,
  action_by UUID,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Blocked patterns
CREATE TABLE blocked_patterns (
  id UUID PRIMARY KEY,
  pattern TEXT,
  pattern_type TEXT DEFAULT 'regex',
  reason moderation_reason,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP DEFAULT now()
);
```

## Moderation Statuses

| Status | Description |
|--------|-------------|
| `pending` | Awaiting review |
| `approved` | Content is safe |
| `rejected` | Content blocked |
| `auto_approved` | AI approved (high confidence) |
| `auto_rejected` | AI rejected (high confidence) |

## Manual Review

For edge cases, admins can manually review:

```typescript
const updateModerationStatus = async (
  queueId: string,
  status: 'approved' | 'rejected',
  notes?: string
) => {
  await supabase
    .from('moderation_queue')
    .update({
      status,
      reviewed_by: currentUser.id,
      reviewed_at: new Date().toISOString(),
      review_notes: notes,
    })
    .eq('id', queueId);
};
```

## Best Practices

### For Creators

1. **Use appropriate imagery** - Family-friendly content
2. **Check before upload** - Review your assets
3. **Avoid edge cases** - Clear, unambiguous art
4. **Respect guidelines** - Follow platform rules

### For Developers

1. **Always moderate** - Don't skip moderation
2. **Handle failures** - Graceful error handling
3. **Log everything** - Audit trail for reviews
4. **Cache wisely** - Balance speed and freshness

## Error Handling

```typescript
try {
  const result = await moderateImage(file);
  if (!result.is_safe) {
    toast.error("Image rejected", {
      description: result.reasons.join(", ")
    });
  }
} catch (error) {
  toast.error("Moderation failed", {
    description: "Please try again"
  });
}
```

## Performance Tips

1. **Batch uploads** - Process multiple files
2. **Use caching** - Avoid re-scanning
3. **Adjust concurrency** - Balance speed/load
4. **Compress images** - Faster uploads
