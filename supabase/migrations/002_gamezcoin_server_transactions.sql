-- Gamezcoin server-authoritative reward, check-in and withdrawal transactions.

create or replace function public.gamezcoin_award_game_session(p_user_id uuid,p_session_id uuid,p_score integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_session public.gamezcoin_game_sessions%rowtype; v_game public.gamezcoin_games%rowtype; v_elapsed_ms bigint; v_max_score bigint; v_coin bigint;
  v_ref public.gamezcoin_referrals%rowtype; v_inviter_bonus bigint:=0; v_invitee_bonus bigint:=0; v_game_reward_count bigint;
begin
  if p_score is null or p_score<0 then return jsonb_build_object('rejected',true,'reason','INVALID_SCORE'); end if;
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
  v_coin:=p_score::bigint*v_game.coin_per_point::bigint;
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
  return jsonb_build_object('rejected',false,'score',p_score,'game_coin',v_coin,'referral_inviter_coin',v_inviter_bonus,'referral_invitee_coin',v_invitee_bonus);
end;
$$;

create or replace function public.gamezcoin_claim_checkin(p_user_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_date date:=(timezone('Asia/Bangkok',now()))::date; v_reward bigint; v_id uuid;
begin
  select (value#>>'{}')::bigint into v_reward from public.gamezcoin_settings where key='daily_checkin_coin'; v_reward:=coalesce(v_reward,100);
  insert into public.gamezcoin_checkins(user_id,checkin_date,reward_coin) values(p_user_id,v_date,v_reward)
  on conflict(user_id,checkin_date) do nothing returning id into v_id;
  if v_id is null then return jsonb_build_object('claimed',false,'reward_coin',0,'date',v_date); end if;
  insert into public.gamezcoin_wallet_ledger(user_id,amount,entry_type,description,source_id,idempotency_key)
  values(p_user_id,v_reward,'daily_checkin','Điểm danh hằng ngày',v_id,'checkin:'||p_user_id::text||':'||v_date::text);
  update public.gamezcoin_wallets set balance=balance+v_reward,lifetime_earned=lifetime_earned+v_reward,updated_at=now() where user_id=p_user_id;
  return jsonb_build_object('claimed',true,'reward_coin',v_reward,'date',v_date);
end;
$$;

create or replace function public.gamezcoin_create_withdrawal(p_user_id uuid,p_coin_amount bigint,p_method text,p_account_name text,p_account_number text,p_bank_name text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_min bigint; v_balance bigint; v_id uuid;
begin
  if p_method not in('momo','bank') then raise exception 'INVALID_METHOD'; end if;
  if nullif(trim(p_account_name),'') is null or nullif(trim(p_account_number),'') is null then raise exception 'INVALID_ACCOUNT'; end if;
  select (value#>>'{}')::bigint into v_min from public.gamezcoin_settings where key='min_withdrawal_coin'; v_min:=coalesce(v_min,20000);
  if p_coin_amount<v_min then raise exception 'BELOW_MIN_WITHDRAWAL'; end if;
  select balance into v_balance from public.gamezcoin_wallets where user_id=p_user_id for update;
  if v_balance is null or v_balance<p_coin_amount then raise exception 'INSUFFICIENT_BALANCE'; end if;
  insert into public.gamezcoin_withdrawals(user_id,coin_amount,method,account_name,account_number,bank_name)
  values(p_user_id,p_coin_amount,p_method,trim(p_account_name),trim(p_account_number),nullif(trim(p_bank_name),'')) returning id into v_id;
  update public.gamezcoin_wallets set balance=balance-p_coin_amount,updated_at=now() where user_id=p_user_id;
  insert into public.gamezcoin_wallet_ledger(user_id,amount,entry_type,description,source_id,idempotency_key)
  values(p_user_id,-p_coin_amount,'withdrawal_hold','Giữ coin cho yêu cầu rút tiền',v_id,'withdrawal:hold:'||v_id::text);
  return jsonb_build_object('id',v_id,'status','pending','coin_amount',p_coin_amount);
end;
$$;

create or replace function public.gamezcoin_process_withdrawal(p_admin_id uuid,p_withdrawal_id uuid,p_action text,p_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_w public.gamezcoin_withdrawals%rowtype;
begin
  if not exists(select 1 from public.gamezcoin_admins where user_id=p_admin_id) then raise exception 'NOT_ADMIN'; end if;
  if p_action not in('approve','reject') then raise exception 'INVALID_ACTION'; end if;
  select * into v_w from public.gamezcoin_withdrawals where id=p_withdrawal_id for update;
  if not found then raise exception 'WITHDRAWAL_NOT_FOUND'; end if;
  if v_w.status<>'pending' then raise exception 'WITHDRAWAL_ALREADY_PROCESSED'; end if;
  if p_action='approve' then
    update public.gamezcoin_withdrawals set status='paid',admin_note=p_note,processed_by=p_admin_id,processed_at=now() where id=p_withdrawal_id;
    update public.gamezcoin_wallets set lifetime_withdrawn=lifetime_withdrawn+v_w.coin_amount,updated_at=now() where user_id=v_w.user_id;
  else
    update public.gamezcoin_withdrawals set status='rejected',admin_note=p_note,processed_by=p_admin_id,processed_at=now() where id=p_withdrawal_id;
    update public.gamezcoin_wallets set balance=balance+v_w.coin_amount,updated_at=now() where user_id=v_w.user_id;
    insert into public.gamezcoin_wallet_ledger(user_id,amount,entry_type,description,source_id,idempotency_key)
    values(v_w.user_id,v_w.coin_amount,'withdrawal_refund','Hoàn coin do yêu cầu rút bị từ chối',v_w.id,'withdrawal:refund:'||v_w.id::text);
  end if;
  return jsonb_build_object('id',v_w.id,'status',case when p_action='approve' then 'paid' else 'rejected' end);
end;
$$;

create or replace function public.gamezcoin_admin_adjust_coin(p_admin_id uuid,p_user_id uuid,p_amount bigint,p_note text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_balance bigint; v_id uuid:=gen_random_uuid();
begin
  if not exists(select 1 from public.gamezcoin_admins where user_id=p_admin_id) then raise exception 'NOT_ADMIN'; end if;
  if p_amount=0 then raise exception 'ZERO_AMOUNT'; end if;
  if nullif(trim(p_note),'') is null then raise exception 'NOTE_REQUIRED'; end if;
  select balance into v_balance from public.gamezcoin_wallets where user_id=p_user_id for update;
  if v_balance is null then raise exception 'USER_NOT_FOUND'; end if;
  if v_balance+p_amount<0 then raise exception 'INSUFFICIENT_BALANCE'; end if;
  update public.gamezcoin_wallets set balance=balance+p_amount,lifetime_earned=lifetime_earned+case when p_amount>0 then p_amount else 0 end,updated_at=now() where user_id=p_user_id;
  insert into public.gamezcoin_wallet_ledger(id,user_id,amount,entry_type,description,idempotency_key)
  values(v_id,p_user_id,p_amount,'admin_adjustment',trim(p_note),'admin:'||v_id::text);
  return jsonb_build_object('user_id',p_user_id,'amount',p_amount,'balance',v_balance+p_amount);
end;
$$;
