import "./tz.js";
import { buildApp } from "./app.js";

const { app, ctx } = await buildApp();
await app.listen({ host: ctx.cfg.HOST, port: ctx.cfg.PORT });
for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => void app.close().then(() => process.exit(0)));
