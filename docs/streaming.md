# Streaming Features

The Lily Pad includes integrated streaming capabilities for creators.

## Overview

Creators can stream directly on the platform, enabling:
- Live engagement with community during mints
- Tips and donations from viewers
- Stream analytics and metrics
- VOD clips and highlights

## Streaming Dashboard

Access the streaming dashboard at `/dashboard`:

- View analytics
- Manage stream settings
- See earnings breakdown
- Track followers

## Going Live

### Prerequisites

1. Connected wallet
2. Streamer profile set up
3. Stream key configured

### Stream Setup

Navigate to `/go-live` to configure:

```typescript
interface StreamSettings {
  title: string;
  category: string;
  thumbnail?: string;
  streamKey: string;
}
```

### OBS Configuration

1. Get your stream key from settings
2. Configure OBS:
   - Server: `rtmp://stream.lilypad.xyz/live`
   - Stream Key: Your unique key

## Viewer Features

### Watch Streams

Browse live streams at `/streams`:
- Filter by category
- Sort by viewers
- See streamer info

### Tipping

Support streamers with MON:

```tsx
<TipButton streamerId={streamerId} />
```

Tip flow:
1. Click tip button
2. Enter amount
3. Confirm transaction
4. Tip recorded on-chain

### Following

Follow streamers to get notifications:

```tsx
<FollowButton streamerId={streamerId} />
```

## Clips

Create and share memorable moments:

### Creating Clips

```tsx
<ClipCreationModal
  streamId={streamId}
  startTime={currentTime - 30}
  duration={30}
/>
```

### Viewing Clips

Navigate to `/clip/:clipId`:
- View clip
- React with emojis
- Share to social
- Comment

### Clip Analytics

Track clip performance:
- Views
- Shares
- Reactions
- Engagement

## Streamer Profiles

### Profile Setup

Configure at `/edit-profile`:

```typescript
interface StreamerProfile {
  displayName: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  categories: string[];
  socialLinks: {
    twitter?: string;
    discord?: string;
    youtube?: string;
  };
  schedule?: ScheduleEntry[];
}
```

### Profile View

View profiles at `/streamer/:streamerId`:
- Bio and info
- Past streams
- Clips
- Schedule
- Social links

## Notifications

### Live Notifications

Get notified when followed streamers go live:

```tsx
<NotificationBell />
```

Features:
- Browser notifications
- Sound alerts
- Notification settings

### Push Subscriptions

Enable push notifications:

```typescript
interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}
```

## Donations & Earnings

### Donor Leaderboard

```tsx
<DonorLeaderboard streamerId={streamerId} />
```

Shows top supporters with:
- Wallet address
- Total donated
- Recent tips

### Earnings Dashboard

View at `/dashboard`:
- Total earnings
- Tips breakdown
- By stream
- By time period

## Analytics

### Stream Analytics

Track in real-time:
- Concurrent viewers
- Peak viewers
- Chat messages
- New followers

### Historical Data

View past stream performance:

```typescript
interface StreamAnalytics {
  streamId: string;
  concurrentViewers: number;
  chatMessages: number;
  newFollowers: number;
  recordedAt: Date;
}
```

## Components

### TipModal

```tsx
<TipModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  streamerId={streamerId}
  onTipSuccess={handleTipSuccess}
/>
```

### NextStreamCountdown

```tsx
<NextStreamCountdown streamerId={streamerId} />
```

### StreamerSchedules

```tsx
<StreamerSchedules streamerId={streamerId} />
```

## Database Schema

```sql
-- Streams
CREATE TABLE streams (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  is_live BOOLEAN DEFAULT false,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  thumbnail_url TEXT,
  total_views INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0
);

-- Stream keys
CREATE TABLE stream_keys (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  stream_key TEXT UNIQUE,
  name TEXT DEFAULT 'Default',
  is_active BOOLEAN DEFAULT true
);

-- Followers
CREATE TABLE followers (
  id UUID PRIMARY KEY,
  follower_id UUID NOT NULL,
  streamer_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Earnings
CREATE TABLE earnings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  amount DECIMAL NOT NULL,
  currency TEXT DEFAULT 'MON',
  type TEXT NOT NULL,
  from_user_id UUID,
  stream_id UUID,
  message TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Clips
CREATE TABLE clips (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  stream_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  clip_url TEXT,
  thumbnail_url TEXT,
  start_time_seconds INTEGER,
  duration_seconds INTEGER DEFAULT 30,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);
```

## Best Practices

### For Streamers

1. **Consistent schedule** - Stream regularly
2. **Engage with chat** - Respond to viewers
3. **Quality setup** - Good audio/video
4. **Promote streams** - Share on socials
5. **Thank supporters** - Acknowledge tips

### For Viewers

1. **Follow favorites** - Get notifications
2. **Support creators** - Tip when you can
3. **Engage in chat** - Be respectful
4. **Share clips** - Spread great content
