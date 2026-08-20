-- Backward compatibility for cached clients: opening a game only creates a pending entry.
-- The pending entry becomes progress only after finish_game verifies a rewarded session.

create or replace function public.gamezcoin_record_daily_game_entry(
  p_user_id uuid,
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
  v_inserted boolean := false;
  v_progress integer := 0;
begin
  if p_entry_id is null or char_length(p_entry_id) < 8 or char_length(p_entry_id) > 160 then
    return jsonb_build_object('recorded', false, 'error', 'INVALID_ENTRY_ID');
  end if;

  if not exists(select 1 from public.gamezcoin_games where id = p_game_id and enabled = true) then
    return jsonb_build_object('recorded', false, 'error', 'GAME_DISABLED');
  end if;

  insert into public.gamezcoin_daily_game_entries(user_id, task_date, entry_id, game_id, session_id)
  values(p_user_id, v_date, p_entry_id, p_game_id, null)
  on conflict (user_id, task_date, entry_id) do nothing
  returning true into v_inserted;

  select count(*)::integer into v_progress
  from public.gamezcoin_daily_game_entries
  where user_id = p_user_id
    and task_date = v_date
    and session_id is not null;

  return jsonb_build_object(
    'recorded', false,
    'pending', coalesce(v_inserted, false),
    'completion_required', true,
    'progress', least(v_progress, 10),
    'target', 10,
    'date', v_date
  );
end;
$$;

create or replace function public.gamezcoin_complete_pending_daily_game_entry(
  p_user_id uuid,
  p_session_id uuid,
  p_game_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_date date := timezone('Asia/Bangkok', now())::date;
  v_status text;
  v_entry_id text;
  v_progress integer := 0;
  v_reward jsonb;
begin
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

  if exists(
    select 1 from public.gamezcoin_daily_game_entries
    where user_id = p_user_id and task_date = v_date and session_id = p_session_id
  ) then
    select count(*)::integer into v_progress
    from public.gamezcoin_daily_game_entries
    where user_id = p_user_id and task_date = v_date and session_id is not null;
    return jsonb_build_object('recorded', false, 'already_recorded', true, 'progress', least(v_progress,10), 'target',10, 'date',v_date);
  end if;

  select entry_id into v_entry_id
  from public.gamezcoin_daily_game_entries
  where user_id = p_user_id
    and task_date = v_date
    and game_id = p_game_id
    and session_id is null
  order by created_at desc
  limit 1
  for update skip locked;

  if v_entry_id is null then
    return jsonb_build_object('recorded', false, 'pending_not_found', true, 'date', v_date);
  end if;

  update public.gamezcoin_daily_game_entries
  set session_id = p_session_id
  where user_id = p_user_id
    and task_date = v_date
    and entry_id = v_entry_id
    and session_id is null;

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
    'recorded', true,
    'entry_id', v_entry_id,
    'progress', least(v_progress, 10),
    'target', 10,
    'reward', v_reward,
    'date', v_date
  );
end;
$$;

revoke all on function public.gamezcoin_record_daily_game_entry(uuid, text, text) from public, anon, authenticated;
revoke all on function public.gamezcoin_complete_pending_daily_game_entry(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.gamezcoin_record_daily_game_entry(uuid, text, text) to service_role;
grant execute on function public.gamezcoin_complete_pending_daily_game_entry(uuid, uuid, text) to service_role;
