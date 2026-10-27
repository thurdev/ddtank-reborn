import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Button, LocaleToggle } from "@ddtank/ui";
import { Heart, Play } from "lucide-react";
import { api, meQuery } from "@/lib/api";
import { useI18n } from "@/i18n";

export function Logo() {
  return (
    <Link to="/" className="group flex items-center gap-2" aria-label="DDTank">
      <svg viewBox="0 0 64 64" className="size-9" aria-hidden>
        <rect width="64" height="64" rx="16" className="fill-panel-2" />
        <path d="M8 52 Q 32 4 56 44" className="stroke-sun" strokeWidth="4" strokeLinecap="round" strokeDasharray="1 8" fill="none" />
        <circle cx="54" cy="46" r="7" className="fill-coral transition-transform group-hover:-translate-y-1" />
        <rect x="6" y="46" width="16" height="10" rx="3" className="fill-mint" />
      </svg>
      <span className="title-plate text-2xl text-ink">DDTank</span>
    </Link>
  );
}

const navLink =
  "rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-ink data-[status=active]:text-sun";

export function SiteLayout() {
  const { t, locale, setLocale } = useI18n();
  const { data: me } = useQuery(meQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const logout = () => {
    api.setToken(null);
    qc.setQueryData(meQuery.queryKey, null);
    void navigate({ to: "/" });
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-sun focus:px-3 focus:py-2 focus:text-night-deep"
        >
          {t("a11y.skipToContent")}
        </a>
        <header className="sticky top-0 z-30 border-b border-line/60 bg-night/85 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
            <Logo />
            <nav className="ml-2 hidden items-center gap-1 md:flex">
              <Link to="/" className={navLink} activeOptions={{ exact: true }}>
                {t("nav.home")}
              </Link>
              <Link to="/ranking" className={navLink}>
                {t("nav.ranking")}
              </Link>
              <Link to="/apoiar" className={navLink}>
                {t("nav.support")}
              </Link>
              {me && (
                <Link to="/account" className={navLink}>
                  {t("nav.account")}
                </Link>
              )}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <LocaleToggle locale={locale} onChange={setLocale} />
              {me ? (
                <Button variant="ghost" size="sm" onClick={logout}>
                  {t("nav.logout")}
                </Button>
              ) : (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">{t("nav.login")}</Link>
                </Button>
              )}
              {/* Oculto no mobile: já está no nav de pills logo abaixo (`md:hidden`) — sem isso, os botões
               *  deste cluster ("Idioma" + "Entrar"/"Sair" + "Apoiar" + "Jogar") não cabem em 390px e
               *  estouram a largura da página (achado na rodada 3, `docs/plan/SITE-ADMIN-REDESIGN.md`). */}
              <Button variant="secondary" size="sm" asChild className="hidden md:inline-flex">
                <Link to="/apoiar">
                  <Heart /> {t("nav.support")}
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/play">
                  <Play /> {t("nav.play")}
                </Link>
              </Button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">
            <Link to="/" className={navLink} activeOptions={{ exact: true }}>
              {t("nav.home")}
            </Link>
            <Link to="/ranking" className={navLink}>
              {t("nav.ranking")}
            </Link>
            <Link to="/apoiar" className={navLink}>
              {t("nav.support")}
            </Link>
            {me && (
              <Link to="/account" className={navLink}>
                {t("nav.account")}
              </Link>
            )}
          </nav>
        </header>
        <main id="main" className="flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
        <footer className="border-t border-line/60 py-8 text-center text-xs text-muted">
          <p>{t("footer.note")}</p>
          <Link to="/transparencia" className="mt-1 inline-block underline hover:text-ink">
            {t("footer.transparency")}
          </Link>
        </footer>
      </div>
    </MotionConfig>
  );
}
