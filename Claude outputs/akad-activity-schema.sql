-- Akad on-chain activity log: one row per verified transaction made through
-- the Akad app. Every row is only written after the server confirms, via
-- Midnight's indexer, that the transaction hash is real, succeeded, and
-- touched this app's contract address, so the table can't be spammed with
-- fake rows just by knowing the schema.
create table public.activity (
  id bigint generated always as identity primary key,
  tx_type text not null check (
    tx_type in ('wrap', 'unwrap', 'addLiquidity', 'swapAkdToNight', 'swapNightToAkd')
  ),
  wallet_address text not null,
  tx_hash text not null unique,
  amount_in text,
  amount_out text,
  token_in text,
  token_out text,
  block_height integer,
  block_time timestamptz,
  created_at timestamptz not null default now()
);

create index activity_created_at_idx on public.activity (created_at desc);
create index activity_wallet_idx on public.activity (wallet_address);

-- RLS is enabled with no policies for anon/authenticated: the anon and
-- service_role keys both exist for this project, but only the service role
-- key (used server-side only, in app/api/activity/route.ts, never shipped
-- to the browser) can read or write this table. A client holding only the
-- anon key gets nothing.
alter table public.activity enable row level security;
