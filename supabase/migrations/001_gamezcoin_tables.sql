-- Gamezcoin production backend. Applied to project lmtcnbhdnryivjgupuct on 2026-08-18.
-- All objects are prefixed gamezcoin_ so existing app data in this Supabase project stays isolated.

create table if not exists public.gamezcoin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Người chơi',
  referral_code text not null unique,
  referred_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.gamezcoin_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.gamezcoin_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  lifetime_earned bigint not null default 0 check (lifetime_earned >= 0),
  lifetime_withdrawn bigint not null default 0 check (lifetime_withdrawn >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.gamezcoin_wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount bigint not null check (amount <> 0),
  entry_type text not null,
  description text not null default '',
  source_id uuid,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists public.gamezcoin_games (
  id text primary key,
  name text not null,
  description text not null default '',
  coin_per_point integer not null default 1 check (coin_per_point > 0),
  min_duration_ms integer not null default 3000 check (min_duration_ms >= 0),
  max_session_seconds integer not null default 1800 check (max_session_seconds between 10 and 86400),
  max_score_per_second numeric(10,2) not null default 20 check (max_score_per_second > 0),
  burst_allowance integer not null default 20 check (burst_allowance >= 0),
  enabled boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.gamezcoin_game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null references public.gamezcoin_games(id),
  nonce uuid not null default gen_random_uuid(),
  server_seed text not null default encode(gen_random_bytes(16), 'hex'),
  status text not null default 'active' check (status in ('active','rewarded','rejected')),
  client_score integer,
  awarded_coin bigint not null default 0,
  reject_reason text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create table if not exists public.gamezcoin_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null,
  reward_coin bigint not null,
  created_at timestamptz not null default now(),
  unique(user_id, checkin_date)
);
create table if not exists public.gamezcoin_referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null unique references auth.users(id) on delete cascade,
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  check (inviter_id <> invitee_id)
);
create table if not exists public.gamezcoin_withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  coin_amount bigint not null check (coin_amount > 0),
  method text not null check (method in ('momo','bank')),
  account_name text not null,
  account_number text not null,
  bank_name text,
  status text not null default 'pending' check (status in ('pending','paid','rejected')),
  admin_note text,
  processed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create table if not exists public.gamezcoin_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists gamezcoin_ledger_user_created_idx on public.gamezcoin_wallet_ledger(user_id, created_at desc);
create index if not exists gamezcoin_sessions_user_created_idx on public.gamezcoin_game_sessions(user_id, started_at desc);
create index if not exists gamezcoin_withdrawals_status_created_idx on public.gamezcoin_withdrawals(status, created_at desc);
create index if not exists gamezcoin_referrals_inviter_idx on public.gamezcoin_referrals(inviter_id, created_at desc);

insert into public.gamezcoin_games(id,name,description,coin_per_point,min_duration_ms,max_session_seconds,max_score_per_second,burst_allowance,sort_order)
values
('tap-rush','Tap Rush','Chạm thật nhanh trong thời gian quy định.',1,8000,60,18,25,1),
('target-hunt','Target Hunt','Chạm mục tiêu xuất hiện ngẫu nhiên.',3,10000,90,4,8,2),
('memory-chain','Chuỗi Trí Nhớ','Ghi nhớ và nhập lại chuỗi số.',10,5000,180,2,10,3)
on conflict (id) do update set name=excluded.name,description=excluded.description,coin_per_point=excluded.coin_per_point,
min_duration_ms=excluded.min_duration_ms,max_session_seconds=excluded.max_session_seconds,max_score_per_second=excluded.max_score_per_second,
burst_allowance=excluded.burst_allowance,sort_order=excluded.sort_order;

insert into public.gamezcoin_settings(key,value) values
('coin_vnd_rate','1'::jsonb),('min_withdrawal_coin','20000'::jsonb),('daily_checkin_coin','100'::jsonb),
('referral_inviter_coin','500'::jsonb),('referral_invitee_coin','200'::jsonb)
on conflict (key) do nothing;

create or replace function public.gamezcoin_make_referral_code() returns text language sql volatile as $$
  select upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
$$;

create or replace function public.gamezcoin_handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
declare v_code text; v_inviter uuid;
begin
  loop
    v_code := public.gamezcoin_make_referral_code();
    exit when not exists(select 1 from public.gamezcoin_profiles where referral_code=v_code);
  end loop;
  insert into public.gamezcoin_profiles(user_id,display_name,referral_code)
  values(new.id,coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),nullif(split_part(coalesce(new.email,''),'@',1),''),'Người chơi'),v_code)
  on conflict(user_id) do nothing;
  insert into public.gamezcoin_wallets(user_id) values(new.id) on conflict(user_id) do nothing;
  if nullif(trim(new.raw_user_meta_data->>'referral_code'),'') is not null then
    select user_id into v_inviter from public.gamezcoin_profiles where referral_code=upper(trim(new.raw_user_meta_data->>'referral_code')) limit 1;
    if v_inviter is not null and v_inviter<>new.id then
      update public.gamezcoin_profiles set referred_by=v_inviter,updated_at=now() where user_id=new.id;
      insert into public.gamezcoin_referrals(inviter_id,invitee_id) values(v_inviter,new.id) on conflict(invitee_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists gamezcoin_on_auth_user_created on auth.users;
create trigger gamezcoin_on_auth_user_created after insert on auth.users for each row execute function public.gamezcoin_handle_new_user();
