
ALTER TABLE public.gigs DROP CONSTRAINT IF EXISTS gigs_freelancer_id_fkey;
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_client_id_fkey;
