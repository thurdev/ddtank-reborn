import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Button, LocaleToggle } from "@ddtank/ui";
import { Heart, Play } from "lucide-react";
import { api, meQuery } from "@/lib/api";
import { useI18n } from "@/i18n";
import { GITHUB_URL } from "@/lib/links";
import { GithubMark } from "@/components/GithubMark";

/** Logo real do projeto (`public/play/logo.webp` — mesma arte usada no `play.css`/launcher), não mais um
 *  ícone genérico + texto (achado da rodada 4: "generic icon + DDTank text" era parte do "parece landing
 *  page genérica"). `size` controla a altura; a largura segue a proporção real do arquivo. */
export function Logo({ size = "size-10" }: { size?: string }) {
  return (
    <Link to="/" className="group flex items-center" aria-label="DDTank Reborn">
      <img src="/play/logo.webp" alt="DDTank Reborn" className={`${size} w-auto object-contain transition-transform group-hover:scale-105`} />
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
        <footer className="border-t border-line/60 bg-night-deep/40">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col items-center gap-3 sm:items-start">
              <Logo size="size-9" />
              <p className="max-w-xs text-center text-xs text-muted sm:text-left">{t("footer.note")}</p>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted sm:justify-end">
              <Link to="/ranking" className="hover:text-ink">
                {t("nav.ranking")}
              </Link>
              <Link to="/apoiar" className="hover:text-ink">
                {t("nav.support")}
              </Link>
              <Link to="/transparencia" className="hover:text-ink">
                {t("footer.transparency")}
              </Link>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-ink">
                <GithubMark className="size-4" aria-hidden /> GitHub
              </a>
            </nav>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
