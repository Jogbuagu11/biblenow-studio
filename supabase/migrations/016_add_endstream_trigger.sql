-- Add trigger to automatically end streams when redirected to /endstream
-- This trigger will be called when a stream's redirect_url is set to the endstream URL

-- Create function to handle endstream redirect
CREATE OR REPLACE FUNCTION handle_endstream_redirect()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the redirect_url is set to the endstream URL
  IF NEW.redirect_url = 'https://stream.biblenow.io/endstream' OR 
     NEW.redirect_url = '/endstream' OR
     NEW.redirect_url LIKE '%/endstream' THEN
    
    -- Mark the stream as ended
    NEW.is_live = false;
    NEW.ended_at = COALESCE(NEW.ended_at, NOW());
    NEW.status = 'ended';
    NEW.updated_at = NOW();
    
    RAISE NOTICE 'Stream % automatically ended due to endstream redirect', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function before update
CREATE TRIGGER trigger_endstream_redirect
  BEFORE UPDATE ON public.livestreams
  FOR EACH ROW
  EXECUTE FUNCTION handle_endstream_redirect();

-- Also create a function to manually end streams by ID
CREATE OR REPLACE FUNCTION end_stream_by_id(stream_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  stream_exists BOOLEAN;
BEGIN
  -- Check if stream exists and is currently live
  SELECT EXISTS(
    SELECT 1 FROM public.livestreams 
    WHERE id = stream_id AND is_live = true
  ) INTO stream_exists;
  
  IF stream_exists THEN
    -- Update the stream to mark it as ended
    UPDATE public.livestreams 
    SET is_live = false,
        ended_at = NOW(),
        status = 'ended',
        updated_at = NOW()
    WHERE id = stream_id;
    
    RAISE NOTICE 'Stream % manually ended', stream_id;
    RETURN true;
  ELSE
    RAISE NOTICE 'Stream % not found or not live', stream_id;
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql; 