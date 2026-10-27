#!/usr/bin/env node
// Roadmap item "Review IA do PR" from docs/BRANCH-FLOW.md: sends the PR diff to Claude with a fixed
// prompt (breaking change / cheat-exploit / segredo vazado / N+1 / migração sem rollback) and posts the
// result as a comment on the PR — never an approval (docs/BRANCH-FLOW.md "não-approvador"). Only called
// by .github/workflows/pr-check.yml's `ai-review` job, which already guards on AI_REVIEW_TOKEN being
// set — this script re-checks anyway so it's safe to run by hand too.
//
// Raw HTTP via fetch (no @anthropic-ai/sdk dependency): same choice apps/api/src/lib/storage.ts made
// for S3 — a one-off script used by a single optional CI job shouldn't add a dependency every
// workspace package install pays for.
//
// Env: ANTHROPIC_API_KEY (the pr-check.yml job maps AI_REVIEW_TOKEN to this), DIFF_FILE (path to the
// PR's unified diff), PR_NUMBER, GH_TOKEN (for `gh pr comment`, the workflow's default GITHUB_TOKEN).
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.log("ANTHROPIC_API_KEY (de AI_REVIEW_TOKEN) não setado — nada a fazer.");
  process.exit(0);
}
const prNumber = process.env.PR_NUMBER;
if (!prNumber) {
  console.error("PR_NUMBER não setado.");
  process.exit(1);
}

// ~25k tokens — limita custo/latência num diff gigante (ex.: um PR que toca o pacote de assets todo).
const MAX_DIFF_CHARS = 100_000;
let diff = readFileSync(process.env.DIFF_FILE ?? "/tmp/pr.diff", "utf8");
let truncated = false;
if (diff.length > MAX_DIFF_CHARS) {
  diff = diff.slice(0, MAX_DIFF_CHARS);
  truncated = true;
}

const prompt = [
  "Você está revisando um pull request do DDTank Reborn (port do servidor DDTank 4.1 de C#/.NET pra TypeScript).",
  "Leia o diff abaixo e aponte SOMENTE problemas reais e específicos, com arquivo:linha quando possível, nestas categorias:",
  "  - breaking change (API pública, protocolo binário, schema do banco)",
  "  - cheat/exploit (validação de servidor que ficou fraca, dado vindo do cliente aceito sem checagem)",
  "  - vazamento de segredo (chave, token, senha, credencial em texto plano)",
  "  - N+1 / query em loop sem necessidade",
  "  - migração de banco sem plano de rollback",
  "Se não achar nada sério nessas categorias, diga isso em uma linha só — não invente problema pra preencher espaço.",
  "Você NUNCA aprova nem reprova o PR; é um revisor que só sugere, quem decide é humano (docs/BRANCH-FLOW.md).",
  truncated ? "\n[diff truncado — revisadas só as primeiras ~25k tokens]" : "",
  "\n--- diff ---\n",
  diff,
]
  .filter(Boolean)
  .join("\n");

const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
  body: JSON.stringify({
    model: "claude-opus-5-5",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    messages: [{ role: "user", content: prompt }],
  }),
});
if (!res.ok) {
  console.error(`Anthropic API ${res.status}: ${await res.text()}`);
  // Falha só a chamada (secret presente mas inválido, rate limit, etc.) — não deve travar merge;
  // por isso este job não é marcado "required" em branch protection (ver docs/deploy/README.md).
  process.exit(1);
}
const data = await res.json();
if (data.stop_reason === "refusal") {
  console.log(`Claude recusou (categoria: ${data.stop_details?.category ?? "?"}) — nada postado.`);
  process.exit(0);
}
const text = data.content?.find((b) => b.type === "text")?.text ?? "(sem texto na resposta)";
const body = ["### Review IA (sugestão automática — não substitui review humano, ver docs/BRANCH-FLOW.md)", "", text].join("\n");

execSync(`gh pr comment ${prNumber} --body-file -`, { input: body, stdio: ["pipe", "inherit", "inherit"] });
