CREATE OR REPLACE FUNCTION public.tg_message_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  recipient uuid;
  sender_name text;
BEGIN
  SELECT CASE WHEN c.user_a = NEW.sender_id THEN c.user_b ELSE c.user_a END
    INTO recipient
  FROM public.conversations c WHERE c.id = NEW.conversation_id;

  IF recipient IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(NULLIF(display_name, ''), 'Someone') INTO sender_name
  FROM public.profiles WHERE id = NEW.sender_id;
  sender_name := COALESCE(sender_name, 'Someone');

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, link)
  VALUES (
    recipient, NEW.sender_id, 'message',
    sender_name || ' sent you a message',
    COALESCE(NULLIF(LEFT(NEW.body, 120), ''), '📎 Attachment'),
    '/messages?c=' || NEW.conversation_id::text
  );
  RETURN NEW;
END $$;