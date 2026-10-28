# Migrações de banco (Drizzle)

**Como verificado**: lido/confirmado contra `packages/db/README.md`, `packages/db/
drizzle/0030_pve_gulu_king_chamber.sql` (padrão idempotente real, usado em produção) e o
comando `db:migrate` já usado em teste (`sharedDb()` chama `migrateDb` todo teste).

## Regra de ouro: NUNCA `db:seed` completo numa base com dados reais

```bash
pnpm --filter @ddt/db db:seed  # TRUNCATE + reinsere TODAS as tabelas do seed — reseta edições do admin!
```

`db:seed` é idempotente no sentido de "pode rodar de novo e dá o mesmo resultado" — mas o
resultado é SEMPRE o estado do seed, perdendo qualquer edição feita no admin desde então.
Só use em banco de teste/dev vazio. **Pra aplicar uma mudança de schema/dado numa base
real, use migração, nunca reseed.**

```bash
DATABASE_URL=... pnpm --filter @ddt/db db:migrate   # só aplica migrações novas, nunca trunca nada
```

## Mudando o schema (coluna/tabela nova)

```bash
# 1. edite packages/db/src/schema/<arquivo>.ts (ou o gerador, se a tabela vem de dump)
pnpm --filter @ddt/db db:gen-schema   # só se usar o gerador a partir de dump
pnpm --filter @ddt/db db:generate     # drizzle-kit generate -> novo .sql em drizzle/
# 3. confira o SQL gerado, rode db:migrate localmente, commite o schema.ts + o .sql juntos
```

Toda `NOT NULL` nova precisa de `DEFAULT` (sem isso quebra em produção com linhas
existentes) — ver exemplos reais em `packages/db/README.md` ("no data migration either
way, every new NOT NULL column has a DEFAULT").

## Migração de DADO (não é mudança de schema) — o padrão idempotente real

Pra inserir/corrigir linhas (ex. uma `Mission_Info` faltando, ver
[instancias.md](./instancias.md)), escreva o `.sql` à mão seguindo este padrão
(`packages/db/drizzle/0030_pve_gulu_king_chamber.sql`, usado de verdade pra corrigir uma
masmorra em produção sem reseed):

```sql
INSERT INTO "game"."Mission_Info" ("Id","Name","Script", ...)
SELECT * FROM (VALUES
  (1176, 'Gà Thường S6', 'GameServerScript.AI.Messions.CNM1176', ...)
) AS v("Id","Name","Script", ...)
WHERE NOT EXISTS (SELECT 1 FROM "game"."Mission_Info" WHERE "Id" = v."Id");
```

**Por que esse padrão**: `WHERE NOT EXISTS` faz a migração ser segura de rodar MAIS DE UMA
VEZ (rodar de novo não duplica nem dá erro de PK) — importante porque `db:migrate` pode ser
reaplicado em ambientes diferentes (dev, staging, prod) sem controle fino de "já rodei
essa". Nunca use `UPDATE` cego numa migração de dado que outra pessoa pode já ter editado
manualmente (ex. o dono já corrigiu via admin) — prefira `WHERE NOT EXISTS`/condições
específicas que só tocam a linha exata que falta.

**Sempre atualize o seed gz também** (`packages/db/seed/game/<Tabela>.json.gz`) quando a
migração adiciona dado permanente — assim um `db:seed` do zero (ambiente novo) já nasce
com a correção, sem depender da migração ter rodado depois.

## Rollback

Toda mudança de schema documenta o rollback no PR (`docs/GAME-SERVER.md` "Toda mudança de
schema vai em migração com rollback descrito no PR") — geralmente um `ALTER TABLE ... DROP
COLUMN` simples, já que a convenção do projeto é nunca precisar migrar dado nos dois
sentidos (toda coluna nova tem `DEFAULT`).

## Testando sua migração sem tocar em nada real

`apps/game/test/helpers.ts` `sharedDb()` já roda `migrateDb` contra um PGlite em memória do
zero a cada suíte de teste — é o jeito mais rápido de confirmar que uma migração nova não
quebra nada: `pnpm --filter game test` já exercita TODAS as migrações aplicadas em
sequência, do zero, antes de rodar qualquer teste.
