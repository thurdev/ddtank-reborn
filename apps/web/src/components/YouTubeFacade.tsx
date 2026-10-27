import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@ddtank/ui";

/**
 * Trailer embed (site-admin-redesign, rodada 4): fachada estática (thumbnail real do vídeo + botão play) até
 * o clique — só então monta o `<iframe>` do `youtube-nocookie.com` (domínio "privacy-enhanced" do YouTube,
 * não seta cookie de rastreio até o usuário interagir) com `autoplay=1` — nunca autoplay da PÁGINA, só depois
 * do clique explícito. Evita carregar o player (JS pesado) pra quem nunca clica.
 */
export function YouTubeFacade({ videoId, title, className }: { videoId: string; title: string; className?: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className={cn("aspect-video overflow-hidden rounded-2xl border border-line bg-night-deep shadow-panel", className)}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          className="size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={title}
      className={cn(
        "group relative block aspect-video w-full overflow-hidden rounded-2xl border border-line bg-night-deep shadow-panel",
        className,
      )}
    >
      <img
        src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
        alt=""
        loading="lazy"
        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        onError={(e) => {
          // nem todo vídeo tem maxres (precisa >=1280px de altura na fonte); cai pro hqdefault, que sempre existe.
          e.currentTarget.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-night/80 via-night/10 to-transparent" />
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid size-16 place-items-center rounded-full bg-sun text-night-deep shadow-toy transition-transform group-hover:scale-110 sm:size-20">
          <Play className="size-7 translate-x-0.5 fill-current sm:size-9" aria-hidden />
        </span>
      </span>
    </button>
  );
}
