-- amivo: who has Premium. Written only by the stripe-webhook function (service role);
-- the app reads its own row through the billing function, so no public policies are needed.
create table if not exists public.premium (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text check (plan in ('monthly', 'yearly', 'lifetime')),
  status text not null default 'none',          -- Stripe's subscription status, or 'active' for lifetime
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  had_trial boolean not null default false,     -- one free trial per account
  stripe_customer_id text,
  stripe_subscription_id text,
  updated_at timestamptz not null default now()
);

create index if not exists premium_customer_idx on public.premium (stripe_customer_id);
create index if not exists premium_subscription_idx on public.premium (stripe_subscription_id);

alter table public.premium enable row level security;
