insert into public.gamezcoin_settings(key,value)
values('block_blast_points_per_coin','10'::jsonb)
on conflict(key) do update set value=excluded.value,updated_at=now();

create or replace function public.gamezcoin_award_game_session(p_user_id uuid, p_session_id uuid, p_score integer)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_session public.gamezcoin_game_sessions%rowtype;
  v_game public.gamezcoin_games%rowtype;
  v_elapsed_ms bigint;
  v_max_score bigint;
  v_coin bigint;
  v_points_per_coin bigint := 10;
  v_ref public.gamezcoin_referrals%rowtype;
  v_inviter_bonus bigint := 0;
  v_invitee_bonus bigint := 0;
  v_game_reward_count bigint;
begin
  if p_score is null or p_score < 0 then
    return jsonb_build_object('rejected',true,'reason','INVALID_SCORE');
  end if;

  select * into v_session from public.gamezcoin_game_sessions where id=p_session_id for update;
  if not found or v_session.user_id<>p_user_id then return jsonb_build_object('rejected',true,'reason','SESSION_NOT_FOUND'); end if;
  if v_session.status<>'active' then return jsonb_build_object('rejected',true,'reason','SESSION_ALREADY_FINISHED'); end if;

  select * into v_game from public.gamezcoin_games where id=v_session.game_id and enabled=true;
  if not found then
    update public.gamezcoin_game_sessions set status='rejected',client_score=p_score,reject_reason='GAME_DISABLED',finished_at=now() where id=p_session_id;
    return jsonb_build_object('rejected',true,'reason','GAME_DISABLED');
  end if;

  v_elapsed_ms:=floor(extract(epoch from(clock_timestamp()-v_session.started_at))*1000);
  if v_elapsed_ms<v_game.min_duration_ms then
    update public.gamezcoin_game_sessions set status='rejected',client_score=p_score,reject_reason='TOO_FAST',finished_at=now() where id=p_session_id;
    return jsonb_build_object('rejected',true,'reason','TOO_FAST');
  end if;
  if v_elapsed_ms>(v_game.max_session_seconds::bigint*1000) then
    update public.gamezcoin_game_sessions set status='rejected',client_score=p_score,reject_reason='SESSION_EXPIRED',finished_at=now() where id=p_session_id;
    return jsonb_build_object('rejected',true,'reason','SESSION_EXPIRED');
  end if;

  v_max_score:=floor((v_elapsed_ms::numeric/1000.0)*v_game.max_score_per_second+v_game.burst_allowance);
  if p_score>v_max_score then
    update public.gamezcoin_game_sessions set status='rejected',client_score=p_score,reject_reason='IMPOSSIBLE_SCORE',finished_at=now() where id=p_session_id;
    return jsonb_build_object('rejected',true,'reason','IMPOSSIBLE_SCORE','max_score',v_max_score);
  end if;

  if v_game.id='block-blast' then
    select greatest(1,coalesce((value#>>'{}')::bigint,10)) into v_points_per_coin
    from public.gamezcoin_settings where key='block_blast_points_per_coin';
    v_points_per_coin:=coalesce(v_points_per_coin,10);
    v_coin:=floor(p_score::numeric/v_points_per_coin)::bigint;
  else
    v_coin:=p_score::bigint*v_game.coin_per_point::bigint;
  end if;

  update public.gamezcoin_game_sessions set status='rewarded',client_score=p_score,awarded_coin=v_coin,finished_at=now() where id=p_session_id;
  if v_coin>0 then
    insert into public.gamezcoin_wallet_ledger(user_id,amount,entry_type,description,source_id,idempotency_key)
    values(p_user_id,v_coin,'game_reward','Thưởng game: '||v_game.name,p_session_id,'game:'||p_session_id::text);
    update public.gamezcoin_wallets set balance=balance+v_coin,lifetime_earned=lifetime_earned+v_coin,updated_at=now() where user_id=p_user_id;
  end if;

  select count(*) into v_game_reward_count from public.gamezcoin_wallet_ledger where user_id=p_user_id and entry_type='game_reward';
  if v_game_reward_count=1 then
    select * into v_ref from public.gamezcoin_referrals where invitee_id=p_user_id and rewarded_at is null for update;
    if found then
      select (value#>>'{}')::bigint into v_inviter_bonus from public.gamezcoin_settings where key='referral_inviter_coin';
      select (value#>>'{}')::bigint into v_invitee_bonus from public.gamezcoin_settings where key='referral_invitee_coin';
      v_inviter_bonus:=coalesce(v_inviter_bonus,0); v_invitee_bonus:=coalesce(v_invitee_bonus,0);
      if v_inviter_bonus>0 then
        insert into public.gamezcoin_wallet_ledger(user_id,amount,entry_type,description,source_id,idempotency_key)
        values(v_ref.inviter_id,v_inviter_bonus,'referral_reward','Thưởng giới thiệu bạn bè',v_ref.id,'referral:inviter:'||v_ref.id::text);
        update public.gamezcoin_wallets set balance=balance+v_inviter_bonus,lifetime_earned=lifetime_earned+v_inviter_bonus,updated_at=now() where user_id=v_ref.inviter_id;
      end if;
      if v_invitee_bonus>0 then
        insert into public.gamezcoin_wallet_ledger(user_id,amount,entry_type,description,source_id,idempotency_key)
        values(p_user_id,v_invitee_bonus,'referral_reward','Thưởng nhập mã giới thiệu',v_ref.id,'referral:invitee:'||v_ref.id::text);
        update public.gamezcoin_wallets set balance=balance+v_invitee_bonus,lifetime_earned=lifetime_earned+v_invitee_bonus,updated_at=now() where user_id=p_user_id;
      end if;
      update public.gamezcoin_referrals set rewarded_at=now() where id=v_ref.id;
    end if;
  end if;

  return jsonb_build_object('rejected',false,'score',p_score,'game_coin',v_coin,'points_per_coin',case when v_game.id='block-blast' then v_points_per_coin else null end,'referral_inviter_coin',v_inviter_bonus,'referral_invitee_coin',v_invitee_bonus);
end;
$function$;
