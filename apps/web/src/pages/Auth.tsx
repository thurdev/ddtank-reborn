import { useState, type ReactNode } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ApiError, Button, Card, Field, Input, TrajectoryArc } from "@ddtank/ui";
import { api, meQuery, type AuthResponse } from "@/lib/api";
import { useI18n } from "@/i18n";

function AuthShell({ title, lead, children, footer }: { title: string; lead: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="relative mx-auto flex max-w-md flex-col px-4 py-14">
      <TrajectoryArc className="absolute -top-2 left-0 w-full text-sun/20" />
      <Card className="relative p-7">
        <h1 className="title-plate text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted">{lead}</p>
        <div className="mt-6">{children}</div>
      </Card>
      <p className="mt-5 text-center text-sm text-muted">{footer}</p>
    </div>
  );
}

function useAuthSuccess() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async (res: AuthResponse, redirect?: string) => {
    api.setToken(res.token);
    await qc.invalidateQueries({ queryKey: meQuery.queryKey });
    void navigate({ to: redirect && redirect.startsWith("/") ? redirect : "/account" });
  };
}

export function LoginPage() {
  const { t } = useI18n();
  const search = useSearch({ strict: false }) as { redirect?: string };
  const onSuccess = useAuthSuccess();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = z.object({
    username: z.string().min(1, t("auth.err.username")),
    password: z.string().min(1, t("auth.err.password")),
  });
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const res = await api.post<AuthResponse>("/api/auth/login", values);
      await onSuccess(res, search.redirect);
    } catch (e) {
      setFormError(e instanceof ApiError && e.status === 401 ? t("auth.err.invalid") : t("common.error"));
    }
  });

  return (
    <AuthShell
      title={t("auth.loginTitle")}
      lead={t("auth.loginLead")}
      footer={
        <>
          {t("auth.noAccount")}{" "}
          <Link to="/register" className="font-semibold text-sun hover:underline">
            {t("nav.register")}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label={t("auth.username")} htmlFor="username" error={formState.errors.username?.message}>
          <Input id="username" autoComplete="username" aria-invalid={!!formState.errors.username} {...register("username")} />
        </Field>
        <Field label={t("auth.password")} htmlFor="password" error={formState.errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!formState.errors.password}
            {...register("password")}
          />
        </Field>
        {formError && (
          <p role="alert" className="rounded-xl bg-coral/15 p-3 text-sm font-medium text-coral">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" disabled={formState.isSubmitting}>
          {t("auth.loginSubmit")}
        </Button>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { t } = useI18n();
  const onSuccess = useAuthSuccess();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = z
    .object({
      username: z.string().regex(/^[A-Za-z0-9_]{4,20}$/, t("auth.err.username")),
      email: z.email(t("auth.err.email")),
      password: z.string().min(6, t("auth.err.password")),
      confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, { path: ["confirm"], message: t("auth.err.mismatch") });
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async ({ username, email, password }) => {
    setFormError(null);
    try {
      const res = await api.post<AuthResponse>("/api/auth/register", { username, email, password });
      toast.success(t("auth.registered"));
      await onSuccess(res);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : t("common.error"));
    }
  });

  const err = formState.errors;
  return (
    <AuthShell
      title={t("auth.registerTitle")}
      lead={t("auth.registerLead")}
      footer={
        <>
          {t("auth.haveAccount")}{" "}
          <Link to="/login" className="font-semibold text-sun hover:underline">
            {t("nav.login")}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label={t("auth.username")} htmlFor="username" error={err.username?.message}>
          <Input id="username" autoComplete="username" aria-invalid={!!err.username} {...register("username")} />
        </Field>
        <Field label={t("auth.email")} htmlFor="email" error={err.email?.message}>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!err.email} {...register("email")} />
        </Field>
        <Field label={t("auth.password")} htmlFor="password" error={err.password?.message}>
          <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!err.password} {...register("password")} />
        </Field>
        <Field label={t("auth.passwordConfirm")} htmlFor="confirm" error={err.confirm?.message}>
          <Input id="confirm" type="password" autoComplete="new-password" aria-invalid={!!err.confirm} {...register("confirm")} />
        </Field>
        {formError && (
          <p role="alert" className="rounded-xl bg-coral/15 p-3 text-sm font-medium text-coral">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" disabled={formState.isSubmitting}>
          {t("auth.registerSubmit")}
        </Button>
      </form>
    </AuthShell>
  );
}
