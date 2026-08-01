-- Enums
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('freelancer','client','admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.gig_status AS ENUM ('active','paused','draft'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.job_status AS ENUM ('open','in_progress','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Shared helpers
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  headline TEXT,
  bio TEXT,
  location TEXT,
  hourly_rate NUMERIC(10,2),
  skills TEXT[] DEFAULT '{}',
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark','light')),
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','pro','business')),
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
CREATE INDEX profiles_email_idx ON public.profiles (lower(email));
CREATE POLICY "Profiles viewable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE TRIGGER set_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Roles viewable by all authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own role" ON public.user_roles FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;

-- Signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  IF NEW.raw_user_meta_data->>'role' IN ('freelancer','client') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing users
INSERT INTO public.profiles (id, display_name, email)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', split_part(u.email,'@',1)), u.email
FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id WHERE p.id IS NULL;

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories viewable by all" ON public.categories FOR SELECT USING (true);
INSERT INTO public.categories (slug, name, icon) VALUES
  ('design','Design & Creative','palette'),
  ('development','Web & Mobile Dev','code'),
  ('writing','Writing & Translation','pen-tool'),
  ('marketing','Marketing','megaphone'),
  ('video','Video & Animation','video'),
  ('ai','AI Services','sparkles'),
  ('data','Data & Analytics','bar-chart'),
  ('admin','Admin Support','briefcase'),
  ('music','Music & Audio','music'),
  ('business','Business','trending-up')
ON CONFLICT (slug) DO NOTHING;

-- Gigs
CREATE TABLE public.gigs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  cover_url TEXT,
  starting_price NUMERIC(10,2) NOT NULL,
  delivery_days INTEGER NOT NULL DEFAULT 7,
  tags TEXT[] DEFAULT '{}',
  status gig_status NOT NULL DEFAULT 'active',
  rating NUMERIC(3,2) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  saves_count INTEGER NOT NULL DEFAULT 0,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gigs TO authenticated;
GRANT SELECT ON public.gigs TO anon;
GRANT ALL ON public.gigs TO service_role;
ALTER TABLE public.gigs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active gigs viewable by all" ON public.gigs FOR SELECT USING (status = 'active' OR freelancer_id = auth.uid());
CREATE POLICY "Freelancers manage own gigs" ON public.gigs FOR ALL USING (auth.uid() = freelancer_id) WITH CHECK (auth.uid() = freelancer_id);
CREATE TRIGGER set_gigs_updated BEFORE UPDATE ON public.gigs FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Jobs
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  budget_min NUMERIC(10,2),
  budget_max NUMERIC(10,2),
  is_hourly BOOLEAN DEFAULT FALSE,
  experience_level TEXT DEFAULT 'intermediate',
  skills TEXT[] DEFAULT '{}',
  status job_status NOT NULL DEFAULT 'open',
  proposals_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  saves_count INTEGER NOT NULL DEFAULT 0,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT ON public.jobs TO anon;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open jobs viewable by all" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "Clients manage own jobs" ON public.jobs FOR ALL USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);
CREATE TRIGGER set_jobs_updated BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Likes & saves
CREATE TABLE public.gig_likes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, gig_id)
);
GRANT SELECT, INSERT, DELETE ON public.gig_likes TO authenticated;
GRANT ALL ON public.gig_likes TO service_role;
ALTER TABLE public.gig_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own likes" ON public.gig_likes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.gig_saves (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, gig_id)
);
GRANT SELECT, INSERT, DELETE ON public.gig_saves TO authenticated;
GRANT ALL ON public.gig_saves TO service_role;
ALTER TABLE public.gig_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own gig saves" ON public.gig_saves FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.job_saves (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);
GRANT SELECT, INSERT, DELETE ON public.job_saves TO authenticated;
GRANT ALL ON public.job_saves TO service_role;
ALTER TABLE public.job_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own job saves" ON public.job_saves FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.job_likes (
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (job_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.job_likes TO authenticated;
GRANT SELECT ON public.job_likes TO anon;
GRANT ALL ON public.job_likes TO service_role;
ALTER TABLE public.job_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view job likes" ON public.job_likes FOR SELECT USING (true);
CREATE POLICY "Users manage their own job likes" ON public.job_likes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Counter triggers
CREATE OR REPLACE FUNCTION public.tg_gig_likes_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN UPDATE public.gigs SET likes_count=likes_count+1 WHERE id=NEW.gig_id;
  ELSIF TG_OP='DELETE' THEN UPDATE public.gigs SET likes_count=GREATEST(likes_count-1,0) WHERE id=OLD.gig_id; END IF;
  RETURN NULL; END $$;
CREATE TRIGGER gig_likes_count AFTER INSERT OR DELETE ON public.gig_likes FOR EACH ROW EXECUTE FUNCTION public.tg_gig_likes_count();

CREATE OR REPLACE FUNCTION public.tg_gig_saves_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN UPDATE public.gigs SET saves_count=saves_count+1 WHERE id=NEW.gig_id;
  ELSIF TG_OP='DELETE' THEN UPDATE public.gigs SET saves_count=GREATEST(saves_count-1,0) WHERE id=OLD.gig_id; END IF;
  RETURN NULL; END $$;
CREATE TRIGGER gig_saves_count AFTER INSERT OR DELETE ON public.gig_saves FOR EACH ROW EXECUTE FUNCTION public.tg_gig_saves_count();

CREATE OR REPLACE FUNCTION public.tg_job_likes_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN UPDATE public.jobs SET likes_count=likes_count+1 WHERE id=NEW.job_id;
  ELSIF TG_OP='DELETE' THEN UPDATE public.jobs SET likes_count=GREATEST(likes_count-1,0) WHERE id=OLD.job_id; END IF;
  RETURN NULL; END $$;
CREATE TRIGGER job_likes_count AFTER INSERT OR DELETE ON public.job_likes FOR EACH ROW EXECUTE FUNCTION public.tg_job_likes_count();

CREATE OR REPLACE FUNCTION public.tg_job_saves_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN UPDATE public.jobs SET saves_count=saves_count+1 WHERE id=NEW.job_id;
  ELSIF TG_OP='DELETE' THEN UPDATE public.jobs SET saves_count=GREATEST(saves_count-1,0) WHERE id=OLD.job_id; END IF;
  RETURN NULL; END $$;
CREATE TRIGGER job_saves_count AFTER INSERT OR DELETE ON public.job_saves FOR EACH ROW EXECUTE FUNCTION public.tg_job_saves_count();

REVOKE EXECUTE ON FUNCTION public.tg_gig_likes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_gig_saves_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_job_likes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_job_saves_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gig_id UUID REFERENCES public.gigs(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (author_id <> subject_id),
  UNIQUE (author_id, subject_id, gig_id, job_id)
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Authors can create reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id AND author_id <> subject_id);
CREATE POLICY "Authors can update own reviews" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can delete own reviews" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = author_id);
CREATE TRIGGER reviews_set_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_reviews_aggregate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target uuid; gig uuid;
BEGIN
  target := COALESCE(NEW.subject_id, OLD.subject_id);
  UPDATE public.profiles p SET
    reviews_count = (SELECT count(*) FROM public.reviews r WHERE r.subject_id = target),
    rating = COALESCE((SELECT round(avg(r.rating)::numeric,2) FROM public.reviews r WHERE r.subject_id = target),0)
  WHERE p.id = target;
  gig := COALESCE(NEW.gig_id, OLD.gig_id);
  IF gig IS NOT NULL THEN
    UPDATE public.gigs g SET
      reviews_count = (SELECT count(*) FROM public.reviews r WHERE r.gig_id = gig),
      rating = COALESCE((SELECT round(avg(r.rating)::numeric,2) FROM public.reviews r WHERE r.gig_id = gig),0)
    WHERE g.id = gig;
  END IF;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.tg_reviews_aggregate() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER reviews_aggregate AFTER INSERT OR UPDATE OR DELETE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.tg_reviews_aggregate();

-- Comments
CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gig_id UUID REFERENCES public.gigs(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT one_target CHECK ((gig_id IS NOT NULL)::int + (job_id IS NOT NULL)::int = 1)
);
CREATE INDEX idx_post_comments_gig ON public.post_comments(gig_id, created_at DESC);
CREATE INDEX idx_post_comments_job ON public.post_comments(job_id, created_at DESC);
GRANT SELECT ON public.post_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read comments" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Authors can insert their comments" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update their comments" ON public.post_comments FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Authors can delete their comments" ON public.post_comments FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
CREATE INDEX notifications_user_unread_idx ON public.notifications (user_id, read, created_at DESC);
CREATE POLICY "Users view their own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update their own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert notifications they trigger" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id OR auth.uid() = user_id);
CREATE POLICY "Users delete their own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Conversations & messages
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hidden_by_a_at TIMESTAMPTZ,
  hidden_by_b_at TIMESTAMPTZ,
  UNIQUE(user_a, user_b)
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
CREATE POLICY "Participants view conversation" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "Users create conversations they participate in" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "Participants update conversation" ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT,
  attachment_url TEXT,
  attachment_type TEXT,
  attachment_name TEXT,
  attachment_size INTEGER,
  reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.messages TO authenticated;
GRANT UPDATE (read_at) ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
CREATE POLICY "Participants read messages" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid())));
CREATE POLICY "Participants send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid())));
CREATE POLICY "Senders delete own messages" ON public.messages FOR DELETE TO authenticated USING (sender_id = auth.uid());
CREATE POLICY "Participants mark received messages read" ON public.messages FOR UPDATE TO authenticated
  USING (sender_id <> auth.uid() AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid())))
  WITH CHECK (sender_id <> auth.uid() AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid())));

-- Proposals
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  freelancer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cover_letter TEXT NOT NULL,
  bid_amount NUMERIC(10,2) NOT NULL,
  delivery_days INT NOT NULL DEFAULT 7,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, freelancer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Freelancer manages own proposals" ON public.proposals FOR ALL TO authenticated USING (auth.uid() = freelancer_id) WITH CHECK (auth.uid() = freelancer_id);
CREATE POLICY "Client sees proposals on own jobs" ON public.proposals FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.client_id = auth.uid()));
CREATE POLICY "Client updates proposal on own jobs" ON public.proposals FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.client_id = auth.uid()));
CREATE TRIGGER proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_proposals_count() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN UPDATE public.jobs SET proposals_count=proposals_count+1 WHERE id=NEW.job_id;
  ELSIF TG_OP='DELETE' THEN UPDATE public.jobs SET proposals_count=GREATEST(0,proposals_count-1) WHERE id=OLD.job_id;
  END IF; RETURN COALESCE(NEW,OLD); END $$;
REVOKE EXECUTE ON FUNCTION public.tg_proposals_count() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER proposals_count_trg AFTER INSERT OR DELETE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.tg_proposals_count();

-- Invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE DEFAULT ('INV-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sender or recipient sees invoice" ON public.invoices FOR SELECT TO authenticated USING (auth.uid() IN (sender_id, recipient_id));
CREATE POLICY "Sender creates invoice" ON public.invoices FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Sender updates own invoice" ON public.invoices FOR UPDATE TO authenticated USING (auth.uid() = sender_id);
CREATE POLICY "Recipient updates invoice status" ON public.invoices FOR UPDATE TO authenticated USING (auth.uid() = recipient_id);
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Wallets
CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_owner_select" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "wallet_owner_insert" ON public.wallets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wallet_owner_update" ON public.wallets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit','withdrawal','purchase','refund')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed')),
  reference TEXT,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX wtx_user_created_idx ON public.wallet_transactions (user_id, created_at DESC);
CREATE POLICY "wtx_owner_select" ON public.wallet_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "wtx_owner_insert" ON public.wallet_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Notify triggers
CREATE OR REPLACE FUNCTION public.tg_message_notify() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recipient uuid; sender_name text;
BEGIN
  SELECT CASE WHEN c.user_a = NEW.sender_id THEN c.user_b ELSE c.user_a END INTO recipient
  FROM public.conversations c WHERE c.id = NEW.conversation_id;
  IF recipient IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(display_name,''), email, 'Someone') INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications (user_id, actor_id, type, title, body, link)
  VALUES (recipient, NEW.sender_id, 'message',
    COALESCE(sender_name,'Someone') || ' sent you a message',
    COALESCE(NULLIF(LEFT(COALESCE(NEW.body,''),120),''), 'Attachment'),
    '/messages?c=' || NEW.conversation_id::text);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.tg_message_notify() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_message_notify AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.tg_message_notify();

CREATE OR REPLACE FUNCTION public.tg_invoice_notify() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sender_name text;
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(display_name,''), email, 'Someone') INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications (user_id, actor_id, type, title, body, link)
  VALUES (NEW.recipient_id, NEW.sender_id, 'invoice',
    'New invoice from ' || COALESCE(sender_name,'Someone'),
    NEW.title || ' - $' || to_char(NEW.total,'FM999999990.00'), '/invoices');
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.tg_invoice_notify() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_invoice_notify AFTER INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.tg_invoice_notify();

-- Storage policies for post-attachments bucket
DROP POLICY IF EXISTS "Anyone can view post-attachments" ON storage.objects;
CREATE POLICY "Anyone can view post-attachments" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'post-attachments');
DROP POLICY IF EXISTS "Users can upload to own folder in post-attachments" ON storage.objects;
CREATE POLICY "Users can upload to own folder in post-attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'post-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can update own post-attachments" ON storage.objects;
CREATE POLICY "Users can update own post-attachments" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'post-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can delete own post-attachments" ON storage.objects;
CREATE POLICY "Users can delete own post-attachments" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'post-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Realtime
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;