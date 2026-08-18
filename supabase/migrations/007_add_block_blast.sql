insert into public.gamezcoin_games (
  id,
  name,
  description,
  coin_per_point,
  min_duration_ms,
  max_session_seconds,
  max_score_per_second,
  burst_allowance,
  enabled,
  sort_order,
  updated_at
)
values (
  'block-blast',
  'Block Blast',
  'Kéo thả khối vào lưới 8x8, phá hàng/cột và tạo combo.',
  1,
  5000,
  7200,
  6.00,
  180,
  true,
  4,
  now()
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  coin_per_point = excluded.coin_per_point,
  min_duration_ms = excluded.min_duration_ms,
  max_session_seconds = excluded.max_session_seconds,
  max_score_per_second = excluded.max_score_per_second,
  burst_allowance = excluded.burst_allowance,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order,
  updated_at = now();
