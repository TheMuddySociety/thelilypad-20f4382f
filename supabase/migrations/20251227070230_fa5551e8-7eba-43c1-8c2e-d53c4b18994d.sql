-- Add columns to stream_chat_messages to support sticker/emoji messages
ALTER TABLE public.stream_chat_messages 
ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text',
ADD COLUMN sticker_url TEXT,
ADD COLUMN sticker_name TEXT,
ADD COLUMN sticker_item_id UUID REFERENCES shop_items(id);

-- Add index for efficient filtering by message type
CREATE INDEX idx_stream_chat_messages_type ON public.stream_chat_messages(message_type);

-- Add comment for documentation
COMMENT ON COLUMN public.stream_chat_messages.message_type IS 'Type of message: text, sticker, or emoji';