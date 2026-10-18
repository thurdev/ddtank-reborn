import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ApiError, Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Field, Input, PageHeader, Skeleton } from "@ddtank/ui";
import { api, meQuery } from "@/lib/api";
import { useI18n } from "@/i18n";
import { useSeo } from "@/lib/seo";
import { fadeUp, stagger } from "@/lib/motion";

function Characters() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery(meQuery);
  if (isLoading) return <Skeleton className="h-40" />;
  const chars = data?.characters ?? [];
  if (!chars.length) return <EmptyState title={t("account.noCharacters")} />;
  return (
    <motion.ul variants={stagger()} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-2">
      {chars.map((c) => (
        <motion.li variants={fadeUp} key={c.id} className="rounded-2xl border border-line bg-night-deep/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-xl">{c.nickname}</p>
            <Badge tone="sun">{t("account.level", { level: c.level })}</Badge>
          </div>
          {c.guild && <p className="text-sm text-muted">{c.guild}</p>}
          <dl className="mt-3 flex gap-6 text-sm">
            <div>
              <dt className="text-muted">{t("account.gold")}</dt>
              <dd className="font-mono text-sun">{c.gold.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("account.money")}</dt>
              <dd className="font-mono text-sky">{c.money.toLocaleString()}</dd>
            </div>
          </dl>
        </motion.li>
      ))}
    </motion.ul>
  );
}

function ChangePassword() {
  const { t } = useI18n();
  const schema = z
    .object({
      currentPassword: z.string().min(1, t("auth.err.password")),
      newPassword: z.string().min(6, t("auth.err.password")),
      confirm: z.string(),
    })
    .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: t("auth.err.mismatch") });
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, formState, reset } = useForm<Values>({ resolver: zodResolver(schema) });
  const err = formState.errors;

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await api.post("/api/account/password", { currentPassword, newPassword });
      toast.success(t("account.passwordSaved"));
      reset();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t("common.error"));
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field label={t("account.currentPassword")} htmlFor="cur" error={err.currentPassword?.message}>
        <Input id="cur" type="password" autoComplete="current-password" {...register("currentPassword")} />
      </Field>
      <Field label={t("account.newPassword")} htmlFor="new" error={err.newPassword?.message}>
        <Input id="new" type="password" autoComplete="new-password" {...register("newPassword")} />
      </Field>
      <Field label={t("auth.passwordConfirm")} htmlFor="confirm" error={err.confirm?.message}>
        <Input id="confirm" type="password" autoComplete="new-password" {...register("confirm")} />
      </Field>
      <Button type="submit" disabled={formState.isSubmitting} className="self-start">
        {t("account.savePassword")}
      </Button>
    </form>
  );
}

export function AccountPage() {
  const { t } = useI18n();
  const { data } = useQuery(meQuery);
  useSeo({ title: t("account.title"), description: t("account.seoDescription") });
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <PageHeader title={t("account.title")} description={data ? `${data.user.username} · ${data.user.email}` : undefined} />
      <motion.div variants={stagger(0, 0.1)} initial="hidden" animate="show" className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader>
              <CardTitle>{t("account.characters")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Characters />
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader>
              <CardTitle>{t("account.changePassword")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ChangePassword />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
