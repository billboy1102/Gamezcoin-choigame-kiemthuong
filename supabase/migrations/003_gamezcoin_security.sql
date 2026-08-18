-- Gamezcoin privileges and RLS.

revoke all on function public.gamezcoin_award_game_session(uuid,uuid,integer) from public,anon,authenticated;
revoke all on function public.gamezcoin_claim_checkin(uuid) from public,anon,authenticated;
revoke all on function public.gamezcoin_create_withdrawal(uuid,bigint,text,text,text,text) from public,anon,authenticated;
revoke all on function public.gamezcoin_process_withdrawal(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.gamezcoin_admin_adjust_coin(uuid,uuid,bigint,text) from public,anon,authenticated;
revoke all on function public.gamezcoin_handle_new_user() from public,anon,authenticated;
grant execute on function public.gamezcoin_award_game_session(uuid,uuid,integer) to service_role;
grant execute on function public.gamezcoin_claim_checkin(uuid) to service_role;
grant execute on function public.gamezcoin_create_withdrawal(uuid,bigint,text,text,text,text) to service_role;
grant execute on function public.gamezcoin_process_withdrawal(uuid,uuid,text,text) to service_role;
grant execute on function public.gamezcoin_admin_adjust_coin(uuid,uuid,bigint,text) to service_role;

alter table public.gamezcoin_profiles enable row level security;
alter table public.gamezcoin_admins enable row level security;
alter table public.gamezcoin_wallets enable row level security;
alter table public.gamezcoin_wallet_ledger enable row level security;
alter table public.gamezcoin_games enable row level security;
alter table public.gamezcoin_game_sessions enable row level security;
alter table public.gamezcoin_checkins enable row level security;
alter table public.gamezcoin_referrals enable row level security;
alter table public.gamezcoin_withdrawals enable row level security;
alter table public.gamezcoin_settings enable row level security;

grant usage on schema public to authenticated;
grant select on public.gamezcoin_profiles,public.gamezcoin_admins,public.gamezcoin_wallets,public.gamezcoin_wallet_ledger,public.gamezcoin_games,
public.gamezcoin_game_sessions,public.gamezcoin_checkins,public.gamezcoin_referrals,public.gamezcoin_withdrawals,public.gamezcoin_settings to authenticated;
revoke insert,update,delete on public.gamezcoin_profiles,public.gamezcoin_admins,public.gamezcoin_wallets,public.gamezcoin_wallet_ledger,public.gamezcoin_games,
public.gamezcoin_game_sessions,public.gamezcoin_checkins,public.gamezcoin_referrals,public.gamezcoin_withdrawals,public.gamezcoin_settings from authenticated,anon;

drop policy if exists gamezcoin_admin_self_select on public.gamezcoin_admins;
create policy gamezcoin_admin_self_select on public.gamezcoin_admins for select to authenticated using((select auth.uid())=user_id);
drop policy if exists gamezcoin_profiles_select on public.gamezcoin_profiles;
create policy gamezcoin_profiles_select on public.gamezcoin_profiles for select to authenticated using((select auth.uid())=user_id or exists(select 1 from public.gamezcoin_admins a where a.user_id=(select auth.uid())));
drop policy if exists gamezcoin_wallets_select on public.gamezcoin_wallets;
create policy gamezcoin_wallets_select on public.gamezcoin_wallets for select to authenticated using((select auth.uid())=user_id or exists(select 1 from public.gamezcoin_admins a where a.user_id=(select auth.uid())));
drop policy if exists gamezcoin_ledger_select on public.gamezcoin_wallet_ledger;
create policy gamezcoin_ledger_select on public.gamezcoin_wallet_ledger for select to authenticated using((select auth.uid())=user_id or exists(select 1 from public.gamezcoin_admins a where a.user_id=(select auth.uid())));
drop policy if exists gamezcoin_sessions_select on public.gamezcoin_game_sessions;
create policy gamezcoin_sessions_select on public.gamezcoin_game_sessions for select to authenticated using((select auth.uid())=user_id or exists(select 1 from public.gamezcoin_admins a where a.user_id=(select auth.uid())));
drop policy if exists gamezcoin_checkins_select on public.gamezcoin_checkins;
create policy gamezcoin_checkins_select on public.gamezcoin_checkins for select to authenticated using((select auth.uid())=user_id or exists(select 1 from public.gamezcoin_admins a where a.user_id=(select auth.uid())));
drop policy if exists gamezcoin_referrals_select on public.gamezcoin_referrals;
create policy gamezcoin_referrals_select on public.gamezcoin_referrals for select to authenticated using((select auth.uid()) in(inviter_id,invitee_id) or exists(select 1 from public.gamezcoin_admins a where a.user_id=(select auth.uid())));
drop policy if exists gamezcoin_withdrawals_select on public.gamezcoin_withdrawals;
create policy gamezcoin_withdrawals_select on public.gamezcoin_withdrawals for select to authenticated using((select auth.uid())=user_id or exists(select 1 from public.gamezcoin_admins a where a.user_id=(select auth.uid())));
drop policy if exists gamezcoin_games_read on public.gamezcoin_games;
create policy gamezcoin_games_read on public.gamezcoin_games for select to authenticated using(true);
drop policy if exists gamezcoin_settings_read on public.gamezcoin_settings;
create policy gamezcoin_settings_read on public.gamezcoin_settings for select to authenticated using(true);
