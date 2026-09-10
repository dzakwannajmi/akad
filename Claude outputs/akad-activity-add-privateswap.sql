-- Adds 'privateSwapAkdToNight' and 'privateSwapNightToAkd' as allowed
-- tx_type values, so private swaps (spending/receiving the AKD leg as a
-- shielded coin instead of a public balance entry) can be recorded in the
-- activity feed alongside the existing public swap/wrap/unwrap types.
-- Run this once in the Supabase SQL Editor against the existing
-- akad-activity-schema.sql table (no data is affected, this only widens
-- the check constraint).
--
-- 'activity_tx_type_check' is Postgres's standard auto-generated name for
-- an inline column check constraint (pattern: {table}_{column}_check). If
-- the DROP below errors with "constraint does not exist", run this first
-- to find the real name, then substitute it in both lines:
--   select conname from pg_constraint
--   where conrelid = 'public.activity'::regclass and contype = 'c';
alter table public.activity drop constraint activity_tx_type_check;
alter table public.activity add constraint activity_tx_type_check
  check (
    tx_type in (
      'wrap',
      'unwrap',
      'addLiquidity',
      'swapAkdToNight',
      'swapNightToAkd',
      'claimFaucet',
      'privateSwapAkdToNight',
      'privateSwapNightToAkd'
    )
  );
