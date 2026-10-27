import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@ddtank/ui";
import { useI18n } from "@/i18n";

export interface GalleryImage {
  src: string;
  caption: string;
}

/**
 * Carrossel + lightbox de capturas reais (site-admin-redesign, rodada 4 — "home.gallery.*"). Cada imagem
 * tem legenda em PT-BR. Um clique abre a imagem em tela cheia (lightbox); setas/teclado navegam nos dois
 * modos. Com 1 imagem só, as setas somem (nada pra navegar) em vez de ficarem desabilitadas à toa.
 */
export function Gallery({ images }: { images: GalleryImage[] }) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  if (!images.length) return null;

  const go = (delta: number) => setIndex((i) => (i + delta + images.length) % images.length);
  const current = images[index]!;

  return (
    <div className="relative">
      <div className="group relative overflow-hidden rounded-2xl border border-line bg-night-deep shadow-panel">
        <button type="button" onClick={() => setLightbox(true)} className="block aspect-video w-full cursor-zoom-in">
          <img src={current.src} alt={current.caption} loading="lazy" className="size-full object-cover" />
        </button>
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t("home.gallery.prev")}
              className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-night/70 text-ink opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t("home.gallery.next")}
              className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-night/70 text-ink opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </>
        )}
        <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night/90 to-transparent px-4 pb-3 pt-8 text-sm text-ink">
          {current.caption}
        </p>
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={img.caption}
              className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-sun" : "w-1.5 bg-line hover:bg-muted")}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-night/95 p-4 backdrop-blur-sm"
            onClick={() => setLightbox(false)}
          >
            <button
              type="button"
              onClick={() => setLightbox(false)}
              aria-label="Fechar"
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-panel text-ink"
            >
              <X className="size-5" aria-hidden />
            </button>
            <motion.img
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              src={current.src}
              alt={current.caption}
              className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-panel"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="absolute bottom-6 left-1/2 max-w-xl -translate-x-1/2 text-center text-sm text-ink">{current.caption}</p>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(-1);
                  }}
                  aria-label={t("home.gallery.prev")}
                  className="absolute left-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-panel text-ink"
                >
                  <ChevronLeft className="size-5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(1);
                  }}
                  aria-label={t("home.gallery.next")}
                  className="absolute right-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-panel text-ink"
                >
                  <ChevronRight className="size-5" aria-hidden />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
