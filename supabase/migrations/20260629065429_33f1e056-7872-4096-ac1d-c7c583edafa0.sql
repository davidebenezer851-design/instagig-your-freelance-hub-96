
ALTER TABLE public.gigs ADD CONSTRAINT gigs_freelancer_profile_fkey FOREIGN KEY (freelancer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_client_profile_fkey FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
