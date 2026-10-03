# Configuração pública do Geral 1

Em 2026-10-03, antes da configuração, `platform_branding` não tinha linha no
projeto `zwjrhqqwizjpzmeayrju`. O login herdava o fallback da instalação.

Aplicado `scripts/supabase/configure-geral-1-branding.sql`: nome público
`CRM Geral`, indicação de fornecedor desativada e origem explícita de
configuração (`seeded_from_env=false`). Não altera assets, design, env, RLS,
policies ou schema. O resolvedor canônico continua servindo a marca do banco.

O script preserva qualquer nome explícito diferente dos nomes herdados. Esta é
uma configuração do staging autorizado; não define a marca de clientes futuros.
A validação visual do login deve ser conferida nas capturas da homologação.
