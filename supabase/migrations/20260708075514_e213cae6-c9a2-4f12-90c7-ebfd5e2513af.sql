REVOKE ALL ON FUNCTION public.tg_message_notify() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tg_message_notify() FROM anon;
REVOKE ALL ON FUNCTION public.tg_message_notify() FROM authenticated;

REVOKE ALL ON FUNCTION public.tg_invoice_notify() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tg_invoice_notify() FROM anon;
REVOKE ALL ON FUNCTION public.tg_invoice_notify() FROM authenticated;