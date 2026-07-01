-- Allow the realtime chat UI to delete sender-owned messages and mark received messages as read.
GRANT DELETE ON public.messages TO authenticated;
GRANT UPDATE (read_at) ON public.messages TO authenticated;

DROP POLICY IF EXISTS "Participants mark received messages read" ON public.messages;
CREATE POLICY "Participants mark received messages read"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  sender_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  )
)
WITH CHECK (
  sender_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  )
);
