import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ApiError, Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Field, Input, PageHeader, Skeleton, Switch, Textarea, cn } from "@ddtank/ui";
import { Check, Coffee, Copy, Heart, Server } from "lucide-react";
import { createDonation, donationStatusQuery, donationSummaryQuery, type DonationCharge } from "@/lib/api";
import { useI18n } from "@/i18n";
import { useSeo } from "@/lib/seo";
import { fadeUp, stagger } from "@/lib/motion";
import { BUY_ME_A_COFFEE_URL } from "@/lib/links";
// Re-exportado por compat com `Apoiar.test.tsx` (`import { BUY_ME_A_COFFEE_URL } from "./Apoiar"`).
export { BUY_ME_A_COFFEE_URL };

/** Official donation link for the DDTank Reborn project (site-admin-redesign) — Buy Me a Coffee, not Pix:
 *  Pix below is a self-host tool (anyone running their own fork can wire their own key), not this project's
 *  donation channel, so it moved to its own route (`/apoiar/pix`, `ApoiarPixPage`) instead of being deleted.
 *  (`BUY_ME_A_COFFEE_URL` itself now lives in `@/lib/links` — reused by the Home page's open-source section
 *  and the footer, rodada 4.) */

const PRESETS_CENTS = [1000, 2000, 5000, 10000];
const centsToBRL = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Barra de progresso simples (meta do mês x total arrecadado). Sem lib externa: só uma div com largura %. */
function GoalBar({ totalCents, goalCents }: { totalCents: number; goalCents: number }) {
  const { t } = useI18n();
  if (!goalCents) return null;
  const pct = Math.min(100, Math.round((totalCents / goalCents) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-mono text-sun">{centsToBRL(totalCents)}</span>
        <span className="text-muted">{t("apoiar.goalOf", { goal: centsToBRL(goalCents) })}</span>
      </div>
      <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-night-deep/60">
        <div className="h-full rounded-full bg-gradient-to-r from-sun to-coral transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Tela da cobrança: QR, copia-e-cola, e polling de status até pagar/expirar. */
function ChargeView({ charge, onReset }: { charge: DonationCharge; onReset: () => void }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const { data } = useQuery({ ...donationStatusQuery(charge.id), refetchInterval: (q) => (q.state.data?.status === "pending" ? 3000 : false) });
  const status = data?.status ?? charge.status;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(charge.brCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("apoiar.copyError"));
    }
  };

  if (status === "paid") {
    return (
      <EmptyState title={t("apoiar.thanksTitle")}>
        <p>{t("apoiar.thanksBody")}</p>
        <Button className="mt-4" onClick={onReset}>
          {t("apoiar.donateAgain")}
        </Button>
      </EmptyState>
    );
  }
  if (status === "expired" || status === "canceled") {
    return (
      <EmptyState title={t("apoiar.expiredTitle")}>
        <p>{t("apoiar.expiredBody")}</p>
        <Button className="mt-4" onClick={onReset}>
          {t("apoiar.tryAgain")}
        </Button>
      </EmptyState>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-lg font-semibold text-ink">{t("apoiar.scanAmount", { amount: centsToBRL(charge.amountCents) })}</p>
      <img
        src={`data:image/png;base64,${charge.qrCodePngBase64}`}
        alt={t("apoiar.qrAlt")}
        className="size-56 rounded-2xl border-2 border-line bg-white p-2"
      />
      <Button variant="secondary" onClick={copy} className="w-full max-w-sm">
        {copied ? <Check /> : <Copy />} {copied ? t("apoiar.copied") : t("apoiar.copyCode")}
      </Button>
      <p className="max-w-sm break-all rounded-xl border border-line bg-night-deep/40 p-3 font-mono text-xs text-muted">{charge.brCode}</p>
      <p className="text-sm text-muted">{t("apoiar.waiting")}</p>
      <button type="button" onClick={onReset} className="text-xs text-muted underline hover:text-ink">
        {t("apoiar.cancel")}
      </button>
    </div>
  );
}

function DonateForm({ minCents, maxCents, onCreated }: { minCents: number; maxCents: number; onCreated: (c: DonationCharge) => void }) {
  const { t } = useI18n();
  const [amount, setAmount] = useState<number>(PRESETS_CENTS[1]!);
  const [custom, setCustom] = useState("");
  const [payerName, setPayerName] = useState("");
  const [message, setMessage] = useState("");
  const [optIn, setOptIn] = useState(false);

  const create = useMutation({
    mutationFn: () => createDonation({ amountCents: effectiveAmount(), payerName: optIn ? payerName.trim() || undefined : undefined, message: message.trim() || undefined, optIn }),
    onSuccess: onCreated,
    onError: (e) => toast.error(e instanceof ApiError ? e.message : t("common.error")),
  });

  const effectiveAmount = () => (custom ? Math.round(Number(custom.replace(",", ".")) * 100) : amount);
  const amt = effectiveAmount();
  const valid = Number.isFinite(amt) && amt >= minCents && amt <= maxCents;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) create.mutate();
      }}
    >
      <div>
        <p className="mb-2 text-sm font-medium text-muted">{t("apoiar.amount")}</p>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS_CENTS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setAmount(c);
                setCustom("");
              }}
              className={cn(
                "rounded-xl border-2 border-line py-2 text-sm font-semibold transition-colors",
                !custom && amount === c ? "border-sun bg-sun/10 text-sun" : "text-muted hover:text-ink",
              )}
            >
              {centsToBRL(c)}
            </button>
          ))}
        </div>
        <Input
          className="mt-2"
          inputMode="decimal"
          placeholder={t("apoiar.customAmount")}
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/[^0-9,.]/g, ""))}
          aria-label={t("apoiar.customAmount")}
        />
        <p className="mt-1 text-xs text-muted">{t("apoiar.amountRange", { min: centsToBRL(minCents), max: centsToBRL(maxCents) })}</p>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-night-deep/40 p-3">
        <div>
          <p className="text-sm font-medium text-ink">{t("apoiar.optInLabel")}</p>
          <p className="text-xs text-muted">{t("apoiar.optInHint")}</p>
        </div>
        <Switch checked={optIn} onCheckedChange={setOptIn} aria-label={t("apoiar.optInLabel")} />
      </div>
      {optIn && (
        <Field label={t("apoiar.payerName")} htmlFor="payerName">
          <Input id="payerName" value={payerName} onChange={(e) => setPayerName(e.target.value)} maxLength={80} placeholder={t("apoiar.payerNamePlaceholder")} />
        </Field>
      )}
      <Field label={t("apoiar.message")} htmlFor="message" hint={t("apoiar.messageHint")}>
        <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} />
      </Field>
      <Button type="submit" disabled={!valid || create.isPending}>
        <Heart /> {t("apoiar.generate")}
      </Button>
    </form>
  );
}

/**
 * site-admin-redesign: the official "Apoiar" page. Buy Me a Coffee (`BUY_ME_A_COFFEE_URL`) is the project's
 * actual donation channel — a Pix flow lived here before, but Pix needs a per-server receiving key, so it
 * only makes sense for someone hosting their own fork, not as "the" way to support this official server.
 * That flow is kept, relabeled and moved to `/apoiar/pix` (`ApoiarPixPage` below), linked from here.
 */
export function ApoiarPage() {
  const { t } = useI18n();
  useSeo({ title: t("apoiar.title"), description: t("apoiar.lead") });

  return (
    <motion.div variants={stagger(0, 0.08)} initial="hidden" animate="show" className="mx-auto max-w-2xl px-4 py-12">
      <PageHeader title={t("apoiar.title")} description={t("apoiar.lead")} />

      <motion.div variants={fadeUp}>
        <Card className="mb-6 border-mint/40 bg-mint/5">
          <CardContent className="flex flex-col gap-2 p-5 text-sm text-muted">
            <p>
              <Badge tone="mint" className="mr-2">
                {t("apoiar.noP2wBadge")}
              </Badge>
              {t("apoiar.noP2wBody")}
            </p>
            <p>{t("apoiar.nonProfitBody")}</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Card className="mb-6 overflow-hidden border-sun/40">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-sun/15 text-sun">
              <Coffee className="size-8" aria-hidden />
            </span>
            <div>
              <h2 className="title-plate text-2xl text-ink">{t("apoiar.bmcTitle")}</h2>
              <p className="mx-auto mt-2 max-w-sm text-muted">{t("apoiar.bmcBody")}</p>
            </div>
            <Button size="xl" asChild>
              <a href={BUY_ME_A_COFFEE_URL} target="_blank" rel="noopener noreferrer">
                <Coffee /> {t("apoiar.bmcCta")}
              </a>
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp} className="mb-6 flex items-center gap-3 rounded-2xl border border-line bg-panel p-5 text-sm">
        <Server className="size-6 shrink-0 text-sky" aria-hidden />
        <p className="flex-1 text-muted">{t("apoiar.selfHostBody")}</p>
        <Link to="/apoiar/pix" className="shrink-0 font-semibold text-sky underline-offset-4 hover:underline">
          {t("apoiar.selfHostLink")}
        </Link>
      </motion.div>
    </motion.div>
  );
}

export function ApoiarPixPage() {
  const { t } = useI18n();
  const [charge, setCharge] = useState<DonationCharge | null>(null);
  const { data: summary, isLoading } = useQuery(donationSummaryQuery);
  useSeo({ title: t("apoiar.pix.title"), description: t("apoiar.pix.lead") });

  return (
    <motion.div variants={stagger(0, 0.08)} initial="hidden" animate="show" className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader title={t("apoiar.pix.title")} description={t("apoiar.pix.lead")} />

      <motion.div variants={fadeUp}>
        <Card className="mb-6 border-sky/40 bg-sky/5">
          <CardContent className="p-5 text-sm text-muted">{t("apoiar.pix.selfHostNote")}</CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Card className="mb-6 border-mint/40 bg-mint/5">
          <CardContent className="flex flex-col gap-2 p-5 text-sm text-muted">
            <p>
              <Badge tone="mint" className="mr-2">
                {t("apoiar.noP2wBadge")}
              </Badge>
              {t("apoiar.noP2wBody")}
            </p>
            <p>{t("apoiar.nonProfitBody")}</p>
          </CardContent>
        </Card>
      </motion.div>

      {isLoading ? (
        <Skeleton className="mb-6 h-16" />
      ) : summary?.goalCents ? (
        <motion.div variants={fadeUp}>
          <Card className="mb-6">
            <CardContent className="p-5">
              <GoalBar totalCents={summary.monthTotalCents} goalCents={summary.goalCents} />
            </CardContent>
          </Card>
        </motion.div>
      ) : null}

      {summary && !summary.enabled ? (
        <EmptyState title={t("apoiar.disabledTitle")}>{t("apoiar.disabledBody")}</EmptyState>
      ) : (
        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader>
              <CardTitle>{t("apoiar.formTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {charge ? (
                <ChargeView charge={charge} onReset={() => setCharge(null)} />
              ) : (
                <DonateForm minCents={summary?.minAmountCents ?? 500} maxCents={summary?.maxAmountCents ?? 500_000} onCreated={setCharge} />
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!!summary?.donors.length && (
        <motion.div variants={fadeUp}>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{t("apoiar.donorsTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {summary.donors.map((d, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-night-deep/30 px-3 py-2 text-sm">
                    <span className="font-medium text-ink">{d.name}</span>
                    <span className="font-mono text-sun">{centsToBRL(d.amountCents)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
