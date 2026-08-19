insert into public.gamezcoin_games (
  id,name,description,coin_per_point,min_duration_ms,max_session_seconds,
  max_score_per_second,burst_allowance,enabled,sort_order,updated_at
) values (
  'orbit-break',
  'ORBIT BREAK',
  'Bấm đúng nhịp để chuyển quỹ đạo. Mỗi lần bấm đúng +10 điểm; 100 điểm = 10 coin.',
  1,0,7200,3.2,4,true,2,now()
)
on conflict (id) do update set
  name=excluded.name,
  description=excluded.description,
  coin_per_point=excluded.coin_per_point,
  min_duration_ms=excluded.min_duration_ms,
  max_session_seconds=excluded.max_session_seconds,
  max_score_per_second=excluded.max_score_per_second,
  burst_allowance=excluded.burst_allowance,
  enabled=true,
  sort_order=excluded.sort_order,
  updated_at=now();
