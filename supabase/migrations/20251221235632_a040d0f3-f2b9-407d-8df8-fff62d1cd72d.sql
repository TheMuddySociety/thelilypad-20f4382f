-- Enable realtime for streams table
ALTER PUBLICATION supabase_realtime ADD TABLE public.streams;

-- Enable realtime for followers table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.followers;