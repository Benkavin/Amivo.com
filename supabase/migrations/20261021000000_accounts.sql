-- amivo: tie each phone's notification schedule to the account that turned it on.
-- Existing rows keep working (user_id stays empty); deleting an account removes its schedules.
alter table public.push_subscriptions
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);
