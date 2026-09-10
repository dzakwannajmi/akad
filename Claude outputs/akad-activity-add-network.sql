-- Adds a 'network' column so each activity row records whether it was
-- verified against Preview or Preprod (see the network toggle added to
-- the app). Nullable and backward compatible: existing rows, all written
-- before this column existed, are implicitly Preview (the only network
-- Akad ran on until now) and are left NULL rather than backfilled with a
-- guess. Run this once in the Supabase SQL Editor against the existing
-- akad-activity-schema.sql table.
alter table public.activity add column network text;
alter table public.activity add constraint activity_network_check
  check (network in ('preview', 'preprod'));

create index activity_network_idx on public.activity (network);
