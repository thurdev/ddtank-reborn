// Port of Tank.Request/CreateLogin.aspx.cs: legacy portal ticket `content=name|key|time|md5(name+key+time+LoginKey)`.
// Disabled unless LOGIN_KEY is configured. Our own site/launcher use /api/auth/login (which issues the key directly).
import { getNameBySite, issueWebKey, verifyCreateLoginContent } from "@ddt/auth";
import { define, text } from "../types.js";

export default define(
  "/CreateLogin.aspx",
  async ({ app, p, ip }) => {
    if (!app.cfg.LOGIN_KEY) return text("4");
    const v = verifyCreateLoginContent(p("content") ?? "", app.cfg.LOGIN_KEY, { maxAgeSec: 300 });
    if (!v.ok) return text(String(v.code));
    const name = v.name.trim().toLowerCase();
    const key = v.key.trim().toLowerCase();
    if (!name || !key) return text("-91010");
    await issueWebKey(app.h, getNameBySite(name, (p("site") ?? "").toLowerCase()), { key, ttlMinutes: app.cfg.LOGIN_KEY_TTL_MIN, ip });
    return text("0");
  },
  "Tank.Request/CreateLogin.aspx.cs",
);
