# Doação via Pix (apoiar o servidor)

> Isto não é uma feature **do jogo** — é do site (`apps/web`) e do admin (`apps/admin`), por
> isso não está no índice de [features/README.md](./README.md) (que é só telas do cliente Flash).
> Regra inegociável do projeto ([README.md](../../README.md) "Apoiar"): **uma doação nunca dá
> vantagem de jogo**. Sem item, sem cupom, sem VIP, sem desconto. No máximo um selo cosmético
> no perfil do site (opt-in). Nada daqui fala com `apps/game`.

## 1. Visão geral

```
apps/web  "Apoiar" ──POST /api/donations──▶ apps/api ──createCharge()──▶ provedor Pix
   │  (QR + copia-e-cola, polling)                │                         │
   │                                        app."Donations"          (fake|static|mercadopago)
   ▼                                               ▲
GET /api/donations/:id (status)         POST /api/pix/webhook ◀──── notificação do PSP
GET /api/donations/summary (público)             │
                                         apps/admin "Doações"
                                    (conciliação, mark-paid fake/static, CSV, settings)
```

- **Provider-agnostic**: `apps/api/src/pix/` define uma interface (`PixProvider`,
  `apps/api/src/pix/types.ts`) e três implementações. Qual roda é escolhido 1x no boot pela
  env `PIX_PROVIDER` (`apps/api/src/pix/index.ts`).
- **Tabela**: `app."Donations"` (`packages/db/src/schema/app.ts`, migration
  `packages/db/drizzle/0017_yummy_shriek.sql`). Nunca guarda CPF/CNPJ ou dado bancário — só o
  que o doador digitou (nome de exibição opcional, mensagem) e o que o provedor devolve
  (status, id da cobrança do lado dele).
- **Settings editáveis no admin** (`app."Settings"` chave `"donation-settings"`, mesmo padrão
  da página "Configuração do servidor"): `enabled`, `goalCents` (meta do mês), `minAmountCents`,
  `maxAmountCents`, `monthlyCostCents` (custo mensal estimado, opcional — alimenta a página
  pública `/transparencia` do site). O campo `provider` aparece só informativo — trocar de
  provedor de verdade exige credenciais no `.env` do servidor, não é seguro fazer isso só por
  um toggle na UI.

## 2. Os três provedores

### `fake` (default, dev/teste)
Sem rede, sem PSP. Gera um BR Code de aparência real (mesmo gerador EMV do `static`) e um PNG
de QR, só pra exercitar a tela de ponta a ponta. Não existe confirmação automática — ou o admin
chama **"Marcar como pago"** na página Doações, ou um teste bate em `POST /api/pix/webhook`
com o header `x-fake-signature: <PIX_FAKE_WEBHOOK_SECRET>` (só pra validar o fluxo de
assinatura/idempotência; nenhum PSP real manda isso).

Habilitar: nada — é o padrão quando `PIX_PROVIDER` não está setado.

### `static` (Pix estático — sem PSP, sem webhook)
BR Code (EMV MPM, "copia e cola") gerado **100% localmente** a partir de uma chave Pix comum
(e-mail, telefone, CPF/CNPJ ou chave aleatória) — zero integração, zero mensalidade de PSP.
Implementação: `apps/api/src/pix/brcode.ts` (TLV + CRC16-CCITT conforme o manual do BACEN),
testado em `apps/api/test/pix-brcode.test.ts`.

Trade-off: **sem webhook** — nada avisa o servidor quando o Pix cai. A confirmação é manual:
o dono olha o extrato do Pix no app do banco e clica "Marcar como pago" na página Doações do
admin (só funciona pra `fake`/`static`; uma doação `mercadopago` só é confirmada pelo webhook,
pra nunca marcar "pago" sem o dinheiro ter de fato chegado).

Habilitar (`.env` do `apps/api`):
```
PIX_PROVIDER=static
PIX_STATIC_KEY=sua-chave-pix@exemplo.com   # ou telefone +55DDDNUMERO, CPF/CNPJ, chave aleatória
PIX_MERCHANT_NAME=DDTANK REBORN            # até 25 chars, só ASCII (truncado/sem acento automaticamente)
PIX_MERCHANT_CITY=BRASIL                   # até 15 chars
```

### `mercadopago` (PSP real — cobrança Pix imediata + webhook)
Escolhido entre as três opções avaliadas (ver comparação abaixo) por ter a API REST mais
simples pra Pix: só `Authorization: Bearer <token>`, sem certificado/mTLS, com webhook
documentado (assinatura HMAC-SHA256 no header `x-signature`). Implementação:
`apps/api/src/pix/mercadopago.ts`.

**Nunca é chamado em teste** (sem rede nos testes, ver `AGENTS.md`) — revise com cuidado antes
de habilitar em produção.

Habilitar (`.env` do `apps/api`):
```
PIX_PROVIDER=mercadopago
PIX_MP_ACCESS_TOKEN=APP_USR-...     # painel Mercado Pago > Suas integrações > Credenciais > Access Token de produção
PIX_MP_WEBHOOK_SECRET=...           # mesma tela, aba "Webhooks" > Secret key
PIX_MP_PAYER_EMAIL=doacao@seudominio.com   # e-mail genérico institucional (API exige um; não coletamos e-mail do doador)
```
E configure no painel do Mercado Pago a URL do webhook: `https://seu-dominio/api/pix/webhook`.

Fluxo de criação: `POST /v1/payments` com `payment_method_id: "pix"` e
`external_reference: <nosso txid>` — a resposta já traz `point_of_interaction.transaction_data`
com o `qr_code` (copia-e-cola) e `qr_code_base64` (PNG), prontos pra devolver ao site.

Fluxo de webhook: a notificação só traz o `data.id` do pagamento; `parseWebhook` busca
`GET /v1/payments/:id` pra saber o status real e o `external_reference` (nosso txid). A
assinatura é verificada **antes** dessa busca (`verifyWebhookSignature`), sobre o manifest
`id:{data.id};request-id:{x-request-id};ts:{ts};` (HMAC-SHA256 com `PIX_MP_WEBHOOK_SECRET`) —
não precisa do corpo bruto byte-a-byte, só dos headers + `data.id`.

#### Por que não Efí/Gerencianet nem Asaas (documentado pra o dono escolher depois, se quiser)
| PSP | A favor | Contra (por isso não foi o escolhido) |
|---|---|---|
| **Mercado Pago** (escolhido) | Só Bearer token; webhook com assinatura HMAC documentada; marca muito conhecida no Brasil; sandbox fácil de testar | Taxa por transação (doações pequenas sentem um pouco) |
| **Efí (ex-Gerencianet)** | Boas taxas pra Pix; API completa | Exige **certificado mTLS** (.p12/.pem) pra toda chamada — mais um segredo pra gerar/renovar/guardar e mais complexidade de infra só pra doação voluntária |
| **Asaas** | API simples, webhook via POST comum, sem mTLS | Exige conta Asaas completa (KYC de "empresa"/MEI) só pra emitir Pix; menos direto pra um projeto sem CNPJ formalizado ainda |

Se o dono preferir trocar depois, a interface `PixProvider` (`apps/api/src/pix/types.ts`) é o
contrato — basta um novo arquivo `apps/api/src/pix/<psp>.ts` implementando `createCharge`,
`verifyWebhookSignature` e `parseWebhook`, registrado em `index.ts`.

## 3. BR Code (Pix "copia e cola") — como foi implementado

`apps/api/src/pix/brcode.ts` monta o payload EMV MPM na mão (sem lib externa):
- `tlv(id, value)`: campo TLV (id de 2 dígitos + tamanho do **valor em bytes**, não caracteres
  — importante pra nomes com acento, por isso o nome/cidade do recebedor passam por
  `toAscii()` antes, removendo acento e qualquer coisa fora do ASCII imprimível).
- `crc16ccitt(payload)`: CRC16/CCITT-FALSE (poly `0x1021`, init `0xFFFF`, sem reflexão, xorout
  `0`) — exatamente o algoritmo exigido pelo manual do BACEN pro campo final `63`. Testado
  contra o vetor de checagem oficial do catálogo CRC (`crc16ccitt("123456789") === "29B1"`).
- `buildBrCode(...)`: monta os campos na ordem fixa (`00` Payload Format Indicator, `26`
  Merchant Account Info com a chave Pix, `52`/`53` categoria/moeda, `54` valor opcional, `58`
  país, `59`/`60` nome/cidade, `62` txid, `63` CRC) e devolve a string completa.
- O PNG do QR em si é gerado pela lib `qrcode` (`QRCode.toDataURL`) a partir dessa string —
  qualquer app de banco lê o BR Code direto da imagem ou do texto copiado.

Testes: `apps/api/test/pix-brcode.test.ts` — vetor do CRC16, TLV (tamanho em bytes vs.
caracteres), round-trip via um parser TLV escrito só pro teste, e os casos de borda (sem
valor fixo, txid vazio → `"***"`, nome/cidade com acento truncados).

## 4. Dados guardados (`app."Donations"`)

| Coluna | O que é |
|---|---|
| `amountCents`, `status`, `provider`, `txid`, `providerChargeId` | Valor, estado (`pending`/`paid`/`expired`/`canceled`), qual provedor atendeu, nosso id de correlação e o id do lado do PSP |
| `brCode` | Copia-e-cola devolvido na criação (reusado no polling; o QR em si **não** é persistido, é regerado só na criação) |
| `payerName`, `message`, `optIn` | O que o doador digitou — só aparece em `GET /api/donations/summary` (lista pública) se `optIn` for `true` |
| `accountId` | Conta do site, se o doador estava logado (opcional — doar não exige conta) |
| `createdAt`, `paidAt`, `expiresAt` | Timestamps |

**Nunca guardado**: CPF/CNPJ, dado bancário, e-mail do doador (o `PIX_MP_PAYER_EMAIL` é um
e-mail institucional genérico, o mesmo em toda cobrança — não é o e-mail de quem doa).

## 5. Endpoints

| Rota | O quê |
|---|---|
| `POST /api/donations` | Cria a cobrança (rate limit: 6/min por IP). Body: `{ amountCents, payerName?, message?, optIn? }`. 400 se fora de `min`/`max`, 503 se `enabled=false`. |
| `GET /api/donations/:id` | Status (`pending`/`paid`/`expired`/`canceled`) pra a tela de polling. |
| `GET /api/donations/summary` | Público: total pago no mês, meta, `min`/`maxAmountCents`, lista de doadores que optaram por aparecer. |
| `POST /api/pix/webhook` | Webhook do provedor ativo. 404 se o provedor não usa webhook (`static`), 401 se a assinatura não validar. Idempotente (doação já `paid`/`expired` não é reprocessada). |
| `GET /api/admin/donations` (+filtros `status`/`provider`) | Lista/conciliação (admin). |
| `GET/PUT /api/admin/donation-settings` | Meta, min/max, enabled (admin). |
| `POST /api/admin/donations/:id/mark-paid` | Confirmação manual — só `fake`/`static`. |
| `GET /api/admin/donations/export` | CSV (admin). |

## 6. Segurança
- Nunca commitar `PIX_MP_ACCESS_TOKEN`/`PIX_MP_WEBHOOK_SECRET` — só em `.env` (ver
  `apps/api/.env.example`), igual a toda outra chave do projeto (`SECURITY.md`).
- Webhook sempre verifica assinatura **antes** de tocar o banco; txid desconhecido ou
  assinatura inválida nunca derruba a doação de outra pessoa.
- `mark-paid` recusa qualquer provedor que não seja `fake`/`static` — uma doação real só é
  confirmada pelo dinheiro de verdade ter chegado (webhook), nunca por um clique no admin.
- Rate limit em `POST /api/donations` evita spam/flood de cobranças (não é proteção de
  pagamento, é só pra não gerar lixo no provedor/banco).

## 7. O que falta decidir (dono do projeto)
- Qual PSP real habilitar em produção (ou ficar só no `static`, que não exige nenhuma conta
  de PSP) — ver comparação na seção 2.
- Valores de `goalCents` (meta do mês) e `monthlyCostCents` (custo real do servidor, opcional)
  — editáveis na página Doações do admin; aparecem em `/apoiar` e `/transparencia` no site.
  Sem preencher `monthlyCostCents`, a página de transparência só mostra um aviso, não força
  divulgar um número.
- Se/quando criar o selo cosmético de doador no perfil do site (fora do escopo desta tarefa:
  hoje a lista pública de apoiadores em `/apoiar` já cobre o reconhecimento básico).
