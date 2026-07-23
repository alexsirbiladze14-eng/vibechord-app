-- ============================================================
-- Vibechord — Week 9 database schema
-- ============================================================
-- Run this whole file once in Supabase: Dashboard -> SQL Editor ->
-- New query -> paste this in -> Run.
--
-- Design notes:
--   - `profiles` holds credits. One row per user, created
--     automatically (via trigger below) the moment someone signs up,
--     starting with 10 free credits.
--   - `saved_progressions` holds a user's saved songs.
--   - `stripe_events` is a small idempotency guard -- Stripe can
--     redeliver the same webhook event more than once, and without
--     this a user could get double-credited from a single payment.
--   - Row Level Security (RLS) is turned on for every table, with
--     policies that only allow a user to see/edit their OWN rows.
--     Even if the anon key leaked, nobody could read anyone else's
--     data or credits.
-- ============================================================

-- ---------- profiles ----------

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  credits integer not null default 10,
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Automatically create a profile (with 10 free credits) the moment
-- someone signs up, rather than requiring a separate app-side insert
-- that could be skipped or fail silently.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Atomic credit deduction: "spend 1 credit if I have any" as a single
-- database operation, so two rapid requests can't both succeed and
-- take a user's credits negative (a plain read-then-write in
-- JavaScript could race; this can't).
create or replace function spend_credit(uid uuid)
returns integer as $$
declare
  remaining integer;
begin
  update profiles
    set credits = credits - 1
    where id = uid and credits > 0
    returning credits into remaining;
  return remaining; -- null if the row didn't match (no credits left)
end;
$$ language plpgsql security definer;

-- Adds credits (used by the Stripe webhook after a successful
-- payment or subscription renewal).
create or replace function add_credits(uid uuid, amount integer)
returns integer as $$
declare
  new_total integer;
begin
  update profiles
    set credits = credits + amount
    where id = uid
    returning credits into new_total;
  return new_total;
end;
$$ language plpgsql security definer;

-- ---------- saved_progressions ----------

create table if not exists saved_progressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  music_key text not null,
  mode text not null,
  degrees integer[] not null,
  created_at timestamptz not null default now()
);

alter table saved_progressions enable row level security;

create policy "Users can view their own saved songs"
  on saved_progressions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own saved songs"
  on saved_progressions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own saved songs"
  on saved_progressions for delete
  using (auth.uid() = user_id);

-- ---------- stripe_events (webhook idempotency) ----------
-- Despite the name (a leftover from an earlier Stripe integration),
-- this table now serves as a generic "have I processed this webhook
-- delivery before?" store for whichever payment provider is in use
-- (currently Lemon Squeezy) — its job is just a text primary key you
-- insert once and check, which doesn't care what's inside the id.
-- No need to re-run this file or rename anything if you already have
-- this table from an earlier setup.

create table if not exists stripe_events (
  id text primary key, -- a provider event id, OR a hash of the request body
  processed_at timestamptz not null default now()
);

-- No RLS policies needed here -- only the server (using the service
-- role key, which bypasses RLS entirely) ever touches this table.
alter table stripe_events enable row level security;
