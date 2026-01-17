-- Add constraint to enforce 500 character limit at database level
ALTER TABLE stream_chat_messages 
ADD CONSTRAINT message_length_check 
CHECK (char_length(message) <= 500);