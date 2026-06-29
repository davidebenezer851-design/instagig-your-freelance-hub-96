# InstaGIG — Build Plan

A freelance marketplace inspired by Upwork (not a copy) with WhatsApp-style messaging. Name: **InstaGIG**. Palette: neon lemon `#D7FF1E` on near-black `#0A0A0A`/`#111111`, off-white text `#F5F5F5`.

## Scope split (because this is large)

**Turn 1 (this turn) — Foundation + Marketing + Auth + Browse**
1. Design system in `src/styles.css` (lemon/black tokens, fonts, shadows, gradients).
2. Enable Lovable Cloud + schema: `profiles`, `user_roles` (freelancer/client/admin), `gigs`, `jobs`, `gig_likes`, `gig_saves`, `job_saves`, `messages`, `conversations`, `attachments`. RLS + GRANTs.
3. Auth: email/password + Google. Signup flow asks **Freelancer or Client** (stored in `user_roles`).
4. Routes:
   - `/` landing (hero, how it works, featured gigs/jobs, CTA)
   - `/auth` sign in/up with role picker
   - `/gigs` browse + filter, `/gigs/$id` detail with like/save/contact
   - `/jobs` browse + filter, `/jobs/$id` detail with save/apply
   - `/_authenticated/dashboard`, `/profile/$id`
   - `/_authenticated/saved`, `/_authenticated/messages` (shell)
   - `/_authenticated/post-gig`, `/_authenticated/post-job` (shell forms)
5. Seed a handful of demo gigs/jobs so browse isn't empty.
6. All nav buttons wired to real routes — no dead links.

**Turn 2 — Posting + applications/orders**
- Full gig & job posting forms with categories, budget, attachments.
- Apply to job / order gig flow → creates conversation.

**Turn 3 — WhatsApp-style messaging**
- Realtime conversations (Supabase Realtime).
- Emoji picker, sticker pack, image/file attachments, camera capture (`<input capture>`), voice notes optional.
- Read receipts, typing indicator, online presence.

## Technical notes

- TanStack Start file routes, TanStack Query for data.
- shadcn components restyled via tokens (no hardcoded colors in JSX).
- Fonts: **Space Grotesk** display + **Inter** body via `@fontsource`.
- Role storage: separate `user_roles` table + `has_role()` security-definer fn (never on profiles).
- Likes/saves use composite-unique `(user_id, gig_id)` tables; toggle via upsert/delete.
- All buttons route to real pages; protected actions redirect to `/auth?redirect=...` when logged out.

Confirm and I'll start Turn 1.