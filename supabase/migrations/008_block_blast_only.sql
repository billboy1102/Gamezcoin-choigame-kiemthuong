-- Keep historical game/session rows for wallet auditability, but expose only Block Blast.
update public.gamezcoin_games
set
  enabled = case when id = 'block-blast' then true else false end,
  sort_order = case when id = 'block-blast' then 1 else sort_order end,
  updated_at = now()
where id in ('tap-rush', 'target-hunt', 'memory-chain', 'block-blast');
