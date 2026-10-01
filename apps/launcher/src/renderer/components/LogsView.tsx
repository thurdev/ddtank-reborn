import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, FolderOpen } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, cn, NativeSelect } from "@ddtank/ui";
import type { LogLine } from "../../shared/types";

const LEVELS: LogLine["level"][] = ["debug", "info", "warn", "error"];
const COLOR: Record<LogLine["level"], string> = { debug: "text-muted/70", info: "text-ink", warn: "text-sun", error: "text-coral" };

export function LogsView({ logFile }: { logFile?: string }) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [min, setMin] = useState<LogLine["level"]>("info");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void window.launcher.getLogs(1000).then(setLines);
    return window.launcher.onLog((l) => setLines((prev) => [...prev.slice(-1999), l]));
  }, []);

  const shown = useMemo(() => lines.filter((l) => LEVELS.indexOf(l.level) >= LEVELS.indexOf(min)), [lines, min]);
  useEffect(() => bottom.current?.scrollIntoView({ block: "end" }), [shown.length]);

  const text = () => shown.map((l) => `[${l.ts}] ${l.level.toUpperCase()} ${l.scope}: ${l.msg}`).join("\n");

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Logs</CardTitle>
        <div className="flex items-center gap-2">
          <NativeSelect className="h-8 w-32 text-sm" value={min} onChange={(e) => setMin(e.target.value as LogLine["level"])}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}+
              </option>
            ))}
          </NativeSelect>
          <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(text())}>
            <Copy /> Copiar
          </Button>
          <Button size="sm" variant="secondary" onClick={() => window.launcher.openLogsFolder()}>
            <FolderOpen /> Abrir pasta
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
        <div className="selectable h-[calc(100vh-220px)] overflow-auto rounded-xl border border-line bg-night-deep p-3 font-mono text-xs leading-relaxed">
          {shown.map((l, i) => (
            <div key={i} className={cn("whitespace-pre-wrap break-all", COLOR[l.level])}>
              <span className="text-muted/60">{l.ts.slice(11, 19)}</span> <span className="text-sky">{l.scope}</span> {l.msg}
            </div>
          ))}
          <div ref={bottom} />
        </div>
        <p className="mt-2 truncate text-xs text-muted selectable">{logFile}</p>
      </CardContent>
    </Card>
  );
}
