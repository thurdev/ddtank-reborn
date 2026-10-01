import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/schema/schemas.ts", "./src/schema/game.ts", "./src/schema/player.ts", "./src/schema/member.ts", "./src/schema/accounts.ts"],
  out: "./drizzle",
  schemaFilter: ["game", "player", "member"],
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/postgres" },
});
