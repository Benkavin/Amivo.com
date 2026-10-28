-- amivo: an optional username for each account, so people can log in with it and a password.
-- Usernames are stored in lowercase and are unique. Only the account function reads this table,
-- so nobody can look up which email belongs to a username.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
