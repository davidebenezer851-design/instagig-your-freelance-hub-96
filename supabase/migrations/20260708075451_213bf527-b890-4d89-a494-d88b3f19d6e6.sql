CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_message_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient uuid;
  sender_name text;
BEGIN
  SELECT CASE WHEN c.user_a = NEW.sender_id THEN c.user_b ELSE c.user_a END
    INTO recipient
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id;

  IF recipient IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(display_name, ''), email, 'Someone')
    INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, link)
  VALUES (
    recipient,
    NEW.sender_id,
    'message',
    COALESCE(sender_name, 'Someone') || ' sent you a message',
    COALESCE(NULLIF(LEFT(COALESCE(NEW.body, ''), 120), ''), '📎 Attachment'),
    '/messages?c=' || NEW.conversation_id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_message_notify ON public.messages;
CREATE TRIGGER trg_message_notify
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.tg_message_notify();

CREATE OR REPLACE FUNCTION public.tg_invoice_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name text;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(display_name, ''), email, 'Someone')
    INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, link)
  VALUES (
    NEW.recipient_id,
    NEW.sender_id,
    'invoice',
    'New invoice from ' || COALESCE(sender_name, 'Someone'),
    NEW.title || ' · $' || to_char(NEW.total, 'FM999999990.00'),
    '/invoices'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_notify ON public.invoices;
CREATE TRIGGER trg_invoice_notify
AFTER INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.tg_invoice_notify();

DROP TRIGGER IF EXISTS invoices_updated_at ON public.invoices;
CREATE TRIGGER invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END;
$$;