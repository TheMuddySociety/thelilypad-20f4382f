-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Public data for users)
create table public.streamer_profiles (
  user_id uuid references auth.users not null primary key,
  username text unique,
  display_name text,
  bio text,
  avatar_url text,
  is_streamer boolean default false,
  verified boolean default false,
  updated_at timestamp with time zone,
  
  constraint username_length check (char_length(username) >= 3)
);

-- RLS for profiles
alter table public.streamer_profiles enable row level security;
create policy "Public profiles are viewable by everyone." on public.streamer_profiles for select using (true);
create policy "Users can insert their own profile." on public.streamer_profiles for insert with check (auth.uid() = user_id);
create policy "Users can update their own profile." on public.streamer_profiles for update using (auth.uid() = user_id);

-- 2. STREAMS
create table public.streams (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  category text default 'Just Chatting',
  is_live boolean default false,
  started_at timestamp with time zone default now(),
  ended_at timestamp with time zone,
  viewer_count int default 0,
  playback_id text, -- ID used for WebRTC room or HLS
  thumbnail_url text,
  
  created_at timestamp with time zone default now()
);

-- RLS for streams
alter table public.streams enable row level security;
create policy "Streams are viewable by everyone." on public.streams for select using (true);
create policy "Users can insert their own streams." on public.streams for insert with check (auth.uid() = user_id);
create policy "Users can update their own streams." on public.streams for update using (auth.uid() = user_id);

-- 3. FOLLOWERS
create table public.followers (
  follower_id uuid references auth.users not null,
  streamer_id uuid references auth.users not null,
  created_at timestamp with time zone default now(),
  
  primary key (follower_id, streamer_id)
);

alter table public.followers enable row level security;
create policy "Follows are viewable by everyone." on public.followers for select using (true);
create policy "Users can follow others." on public.followers for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow." on public.followers for delete using (auth.uid() = follower_id);

-- 4. EMOTES (Channel specific)
create table public.channel_emotes (
  id uuid default uuid_generate_v4() primary key,
  streamer_id uuid references auth.users not null,
  name text not null, -- e.g. "pog"
  image_url text not null,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

alter table public.channel_emotes enable row level security;
create policy "Emotes are viewable by everyone." on public.channel_emotes for select using (true);
create policy "Streamers manage their emotes." on public.channel_emotes for all using (auth.uid() = streamer_id);

-- 5. CHAT MESSAGES
create table public.stream_chat_messages (
  id uuid default uuid_generate_v4() primary key,
  playback_id text not null, -- Linked to stream
  user_id uuid references auth.users,
  username text,
  message text,
  message_type text default 'text', -- 'text', 'sticker', 'emoji'
  sticker_url text,
  sticker_name text,
  sticker_item_id text,
  created_at timestamp with time zone default now()
);

alter table public.stream_chat_messages enable row level security;
create policy "Chat is viewable by everyone." on public.stream_chat_messages for select using (true);
create policy "Authenticated users can post chat." on public.stream_chat_messages for insert with check (auth.role() = 'authenticated');

-- 6. SHOP ITEMS (Sticker Packs, Blind Boxes)
create table public.shop_items (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references auth.users, -- The Creator
  name text not null,
  description text,
  category text not null, -- 'sticker_pack', 'emoji_pack', 'blind_box'
  price float not null, -- Price in SOL
  image_url text,
  metadata_uri text,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

alter table public.shop_items enable row level security;
create policy "Shop items are viewable by everyone." on public.shop_items for select using (true);
create policy "Creators can manage items." on public.shop_items for all using (auth.uid() = owner_id);

-- 7. SHOP ITEM CONTENTS (The stickers inside a pack)
create table public.shop_item_contents (
  id uuid default uuid_generate_v4() primary key,
  shop_item_id uuid references public.shop_items not null,
  name text,
  file_url text not null,
  display_order int default 0,
  rarity text default 'common'
);

alter table public.shop_item_contents enable row level security;
create policy "Contents viewable by everyone." on public.shop_item_contents for select using (true);
create policy "Creators manage contents." on public.shop_item_contents for all using ( 
  exists ( select 1 from public.shop_items where id = shop_item_id and owner_id = auth.uid() ) 
);

-- 8. SHOP PURCHASES
create table public.shop_purchases (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  item_id uuid references public.shop_items not null,
  transaction_signature text,
  price_paid float,
  purchased_at timestamp with time zone default now()
);

alter table public.shop_purchases enable row level security;
create policy "Users see their own purchases." on public.shop_purchases for select using (auth.uid() = user_id);
create policy "System can insert purchases." on public.shop_purchases for insert with check (true); -- In real app, usually restricted to server/webhook

-- 9. USER WALLETS (For Auto-Buy)
create table public.user_wallets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null unique,
  public_key text not null,
  -- Encrypted private key would go here in a real custodial system, 
  -- or this just links a public "bot wallet" address the user controls.
  encrypted_private_key text, 
  label text default 'Spending Wallet',
  created_at timestamp with time zone default now()
);

alter table public.user_wallets enable row level security;
create policy "Users manage their own wallets." on public.user_wallets for all using (auth.uid() = user_id);


-- AUTO CREATE PROFILE ON SIGNUP (Trigger)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.streamer_profiles (user_id, username, display_name)
  values (new.id, new.email, new.email); -- Default username to email
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
