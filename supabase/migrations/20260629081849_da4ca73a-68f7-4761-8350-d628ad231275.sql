
-- Counters & attachments on gigs
ALTER TABLE public.gigs
  ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saves_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saves_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rating numeric(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_count integer NOT NULL DEFAULT 0;

-- job_likes table (parity with gig_likes)
CREATE TABLE IF NOT EXISTS public.job_likes (
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (job_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.job_likes TO authenticated;
GRANT ALL ON public.job_likes TO service_role;
ALTER TABLE public.job_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view job likes" ON public.job_likes FOR SELECT USING (true);
CREATE POLICY "Users manage their own job likes" ON public.job_likes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gig_id uuid REFERENCES public.gigs(id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (author_id <> subject_id),
  UNIQUE (author_id, subject_id, gig_id, job_id)
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Authors can create reviews" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND author_id <> subject_id);
CREATE POLICY "Authors can update own reviews" ON public.reviews FOR UPDATE TO authenticated
  USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can delete own reviews" ON public.reviews FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

CREATE TRIGGER reviews_set_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Counter trigger functions
CREATE OR REPLACE FUNCTION public.tg_gig_likes_count() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN UPDATE public.gigs SET likes_count=likes_count+1 WHERE id=NEW.gig_id;
  ELSIF TG_OP='DELETE' THEN UPDATE public.gigs SET likes_count=GREATEST(likes_count-1,0) WHERE id=OLD.gig_id; END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS gig_likes_count ON public.gig_likes;
CREATE TRIGGER gig_likes_count AFTER INSERT OR DELETE ON public.gig_likes
  FOR EACH ROW EXECUTE FUNCTION public.tg_gig_likes_count();

CREATE OR REPLACE FUNCTION public.tg_gig_saves_count() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN UPDATE public.gigs SET saves_count=saves_count+1 WHERE id=NEW.gig_id;
  ELSIF TG_OP='DELETE' THEN UPDATE public.gigs SET saves_count=GREATEST(saves_count-1,0) WHERE id=OLD.gig_id; END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS gig_saves_count ON public.gig_saves;
CREATE TRIGGER gig_saves_count AFTER INSERT OR DELETE ON public.gig_saves
  FOR EACH ROW EXECUTE FUNCTION public.tg_gig_saves_count();

CREATE OR REPLACE FUNCTION public.tg_job_likes_count() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN UPDATE public.jobs SET likes_count=likes_count+1 WHERE id=NEW.job_id;
  ELSIF TG_OP='DELETE' THEN UPDATE public.jobs SET likes_count=GREATEST(likes_count-1,0) WHERE id=OLD.job_id; END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS job_likes_count ON public.job_likes;
CREATE TRIGGER job_likes_count AFTER INSERT OR DELETE ON public.job_likes
  FOR EACH ROW EXECUTE FUNCTION public.tg_job_likes_count();

CREATE OR REPLACE FUNCTION public.tg_job_saves_count() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN UPDATE public.jobs SET saves_count=saves_count+1 WHERE id=NEW.job_id;
  ELSIF TG_OP='DELETE' THEN UPDATE public.jobs SET saves_count=GREATEST(saves_count-1,0) WHERE id=OLD.job_id; END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS job_saves_count ON public.job_saves;
CREATE TRIGGER job_saves_count AFTER INSERT OR DELETE ON public.job_saves
  FOR EACH ROW EXECUTE FUNCTION public.tg_job_saves_count();

-- Reviews aggregate on profiles (and gigs when linked)
CREATE OR REPLACE FUNCTION public.tg_reviews_aggregate() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE target uuid; gig uuid;
BEGIN
  target := COALESCE(NEW.subject_id, OLD.subject_id);
  UPDATE public.profiles p SET
    reviews_count = (SELECT count(*) FROM public.reviews r WHERE r.subject_id = target),
    rating = COALESCE((SELECT round(avg(r.rating)::numeric, 2) FROM public.reviews r WHERE r.subject_id = target), 0)
  WHERE p.id = target;

  gig := COALESCE(NEW.gig_id, OLD.gig_id);
  IF gig IS NOT NULL THEN
    UPDATE public.gigs g SET
      reviews_count = (SELECT count(*) FROM public.reviews r WHERE r.gig_id = gig),
      rating = COALESCE((SELECT round(avg(r.rating)::numeric, 2) FROM public.reviews r WHERE r.gig_id = gig), 0)
    WHERE g.id = gig;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS reviews_aggregate ON public.reviews;
CREATE TRIGGER reviews_aggregate AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.tg_reviews_aggregate();

-- Backfill existing counters (in case any rows already exist)
UPDATE public.gigs g SET
  likes_count = (SELECT count(*) FROM public.gig_likes l WHERE l.gig_id = g.id),
  saves_count = (SELECT count(*) FROM public.gig_saves s WHERE s.gig_id = g.id);
UPDATE public.jobs j SET
  saves_count = (SELECT count(*) FROM public.job_saves s WHERE s.job_id = j.id);
