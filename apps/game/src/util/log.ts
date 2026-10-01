/** Minimal leveled logger (stdout/stderr). */
export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";
const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

export interface Logger {
  debug(msg: string, ...a: unknown[]): void;
  info(msg: string, ...a: unknown[]): void;
  warn(msg: string, ...a: unknown[]): void;
  error(msg: string, ...a: unknown[]): void;
  child(scope: string): Logger;
}

export function createLogger(level: LogLevel = "info", scope = "game"): Logger {
  const min = ORDER[level];
  const out = (lvl: LogLevel, msg: string, a: unknown[]) => {
    if (ORDER[lvl] < min) return;
    const line = `${new Date().toISOString()} ${lvl.toUpperCase().padEnd(5)} [${scope}] ${msg}`;
    (lvl === "error" || lvl === "warn" ? console.error : console.log)(line, ...a);
  };
  return {
    debug: (m, ...a) => out("debug", m, a),
    info: (m, ...a) => out("info", m, a),
    warn: (m, ...a) => out("warn", m, a),
    error: (m, ...a) => out("error", m, a),
    child: (s) => createLogger(level, `${scope}:${s}`),
  };
}
