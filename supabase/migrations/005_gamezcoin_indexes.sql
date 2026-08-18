-- Cover Gamezcoin foreign keys flagged by the Supabase performance advisor.
create index if not exists gamezcoin_sessions_game_idx on public.gamezcoin_game_sessions(game_id);
create index if not exists gamezcoin_profiles_referred_by_idx on public.gamezcoin_profiles(referred_by);
create index if not exists gamezcoin_withdrawals_user_created_idx on public.gamezcoin_withdrawals(user_id, created_at desc);
create index if not exists gamezcoin_withdrawals_processed_by_idx on public.gamezcoin_withdrawals(processed_by);
