-- Daily game mission hardening: only a server-verified completed game can advance play10.

alter table public.gamezcoin_daily_game_entries
  add column if not exists session_id uuid references public.gamezcoin_game_sessions(id) on delete cascade;

create unique index if not exists gamezcoin_daily_game_entries_session_idx
  on public.gamezcoin_daily_game_entries(user_id, task_date, session_id)
  where session_id is not null;

create or replace function public.gamezcoin_claim_daily_task(p_user_id uuid, p_task text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_date date := timezone('Asia/Bangkok', now())::date;
  v_reward bigint;
  v_target integer;
  v_progress integer;
  v_key text;
  v_ledger_id uuid;
  v_balance bigint;
begin
  if p_task = 'play10' then
    v_reward := 100;
    v_target := 10;
    select count(*)::integer into v_progress
    from public.gamezcoin_daily_game_entries
    where user_id = p_user_id
      and task_date = v_date
      and session_id is not null;
  elsif p_task = 'share' then
    v_reward := 150;
    v_target := 1;
    v_progress := 1;
  else
    return jsonb_build_object('claimed', false, 'error', 'INVALID_TASK');
  end if;

  v_key := 'daily_task:' || p_task || ':' || p_user_id::text || ':' || v_date::text;

  if exists(select 1 from public.gamezcoin_wallet_ledger where idempotency_key = v_key) then
    return jsonb_build_object(
      'claimed', false,
      'already_claimed', true,
      'task', p_task,
      'reward_coin', v_reward,
      'progress', least(v_progress, v_target),
      'target', v_target,
      'date', v_date
    );
  end if;

  if v_progress < v_target then
    return jsonb_build_object(
      'claimed', false,
      'eligible', false,
      'task', p_task,
      'reward_coin', v_reward,
      'progress', v_progress,
      'target', v_target,
      'date', v_date
    );
  end if;

  select balance into v_balance
  from public.gamezcoin_wallets
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  insert into public.gamezcoin_wallet_ledger(
    user_id, amount, entry_type, description, idempotency_key
  ) values (
    p_user_id,
    v_reward,
    'daily_task',
    case when p_task = 'play10' then 'Nhiệm vụ hôm nay: Chơi 10 game bất kỳ'
         else 'Nhiệm vụ hôm nay: Chia sẻ app cho bạn bè' end,
    v_key
  )
  on conflict (idempotency_key) do nothing
  returning id into v_ledger_id;

  if v_ledger_id is null then
    return jsonb_build_object(
      'claimed', false,
      'already_claimed', true,
      'task', p_task,
      'reward_coin', v_reward,
      'progress', least(v_progress, v_target),
      'target', v_target,
      'date', v_date
    );
  end if;

  update public.gamezcoin_wallets
  set balance = balance + v_reward,
      lifetime_earned = lifetime_earned + v_reward,
      updated_at = now()
  where user_id = p_user_id
  returning balance into v_balance;

  return jsonb_build_object(
    'claimed', true,
    'task', p_task,
    'reward_coin', v_reward,
    'progress', least(v_progress, v_target),
    'target', v_target,
    'balance', v_balance,
    'date', v_date
  );
end;
$$;

-- Cached old clients may still call this action when a game opens. It is intentionally a no-op now.
create or replace function public.gamezcoin_record_daily_game_entry(
  p_user_id uuid,
  p_game_id text,
  p_entry_id text
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'recorded', false,
    'completion_required', true,
    'progress', least((
      select count(*)::integer
      from public.gamezcoin_daily_game_entries
      where user_id = p_user_id
        and task_date = timezone('Asia/Bangkok', now())::date
        and session_id is not null
    ), 10),
    'target', 10,
    'date', timezone('Asia/Bangkok', now())::date
  );
$$;

create or replace function public.gamezcoin_record_daily_game_completion(
  p_user_id uuid,
  p_session_id uuid,
  p_game_id text,
  p_entry_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_date date := timezone('Asia/Bangkok', now())::date;
  v_status text;
  v_inserted boolean := false;
  v_progress integer := 0;
  v_reward jsonb;
begin
  if p_entry_id is null or char_length(p_entry_id) < 8 or char_length(p_entry_id) > 160 then
    return jsonb_build_object('recorded', false, 'error', 'INVALID_ENTRY_ID');
  end if;

  select status into v_status
  from public.gamezcoin_game_sessions
  where id = p_session_id
    and user_id = p_user_id
    and game_id = p_game_id;

  if not found then
    return jsonb_build_object('recorded', false, 'error', 'INVALID_SESSION');
  end if;

  if v_status <> 'rewarded' then
    return jsonb_build_object('recorded', false, 'error', 'SESSION_NOT_COMPLETED');
  end if;

  insert into public.gamezcoin_daily_game_entries(user_id, task_date, entry_id, game_id, session_id)
  values(p_user_id, v_date, p_entry_id, p_game_id, p_session_id)
  on conflict do nothing
  returning true into v_inserted;

  select count(*)::integer into v_progress
  from public.gamezcoin_daily_game_entries
  where user_id = p_user_id
    and task_date = v_date
    and session_id is not null;

  if v_progress >= 10 then
    v_reward := public.gamezcoin_claim_daily_task(p_user_id, 'play10');
  else
    v_reward := jsonb_build_object(
      'claimed', false,
      'eligible', false,
      'task', 'play10',
      'reward_coin', 100,
      'progress', v_progress,
      'target', 10,
      'date', v_date
    );
  end if;

  return jsonb_build_object(
    'recorded', coalesce(v_inserted, false),
    'progress', least(v_progress, 10),
    'target', 10,
    'reward', v_reward,
    'date', v_date
  );
end;
$$;

revoke all on function public.gamezcoin_claim_daily_task(uuid, text) from public, anon, authenticated;
revoke all on function public.gamezcoin_record_daily_game_entry(uuid, text, text) from public, anon, authenticated;
revoke all on function public.gamezcoin_record_daily_game_completion(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.gamezcoin_claim_daily_task(uuid, text) to service_role;
grant execute on function public.gamezcoin_record_daily_game_entry(uuid, text, text) to service_role;
grant execute on function public.gamezcoin_record_daily_game_completion(uuid, uuid, text, text) to service_role;
