import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, LocaleToggle, cn } from "@ddtank/ui";
import { LogOut, Menu, Search, X } from "lucide-react";
import { api, meQuery } from "@/lib/api";
import { useI18n, useText, type TKey } from "@/i18n";
import { CommandPalette } from "./CommandPalette";
import { GROUPS, NAV, type NavItem } from "./nav";

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const text = useText();
  const label = (l: NavItem["label"]) => (typeof l === "object" && "key" in l ? t(l.key) : text(l));
  return (
    <nav className="flex flex-col gap-5 px-3 py-4" aria-label="Menu">
      {GROUPS.map((g) => {
        const items = NAV.filter((n) => n.group === g);
        if (!items.length) return null;
        return (
          <div key={g}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted/70">{t(`nav.group.${g}` as TKey)}</p>
            <ul className="flex flex-col gap-0.5">
              {items.map((n) => {
                const Icon = n.icon;
                return (
                  <li key={n.to}>
                    <Link
                      to={n.to}
                      onClick={onNavigate}
                      activeOptions={{ exact: n.to === "/" }}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted transition-colors hover:bg-panel-2 hover:text-ink",
                        "data-[status=active]:bg-sun data-[status=active]:font-semibold data-[status=active]:text-night-deep data-[status=active]:shadow-toy-sm",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {label(n.label)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

/** Logo real do projeto (copiado de `apps/web/public/play/logo.webp` — apps separados, cada um com seu
 *  próprio `public/`), não mais um ícone genérico + texto (rodada 4, mesmo achado do site: "generic icon +
 *  text" não parece o jogo). "Admin" ao lado em texto pequeno, pra não competir com o logo. */
function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2 px-5 py-4">
      <img src="/logo.webp" alt="DDTank Reborn" className="h-9 w-auto object-contain" />
      <span className="title-plate text-sm text-muted">Admin</span>
    </Link>
  );
}

export function AdminLayout() {
  const { t, locale, setLocale } = useI18n();
  const { data: me } = useQuery(meQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Global search (command palette): Ctrl+K / Cmd+K from anywhere in the admin.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const logout = () => {
    api.setToken(null);
    qc.setQueryData(meQuery.queryKey, null);
    void navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-line bg-night-deep lg:flex">
        <Brand />
        <Sidebar />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-night-deep/80" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-line bg-night-deep animate-pop">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <Button variant="ghost" size="icon" aria-label="Fechar menu" onClick={() => setOpen(false)}>
                <X />
              </Button>
            </div>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-night/85 px-4 backdrop-blur">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu" onClick={() => setOpen(true)}>
            <Menu />
          </Button>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-line bg-panel-2/60 px-3 py-1.5 text-sm text-muted transition-colors hover:border-sun hover:text-ink"
          >
            <Search className="size-4" />
            <span className="hidden sm:inline">{t("palette.trigger")}</span>
            <kbd className="hidden rounded-md border border-line bg-night-deep px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-3">
            <LocaleToggle locale={locale} onChange={setLocale} />
            {me && (
              <span className="hidden text-sm text-muted sm:inline">
                {me.username} · <span className="text-sun">{me.role}</span>
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut /> {t("nav.logout")}
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
