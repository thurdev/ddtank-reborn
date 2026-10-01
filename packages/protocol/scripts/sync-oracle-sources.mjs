// Re-copies the original C# sources used by csharp-oracle from vendor/DDTank41 (see csharp-oracle/original/README.txt).
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vendor = resolve(process.argv[2] ?? join(root, "../../vendor/DDTank41"));
const files = [
  ["Game.Base/PacketIn.cs", "original/Game.Base/PacketIn.cs"],
  ["Game.Base/Marshal.cs", "original/Game.Base/Marshal.cs"],
  ["Game.Base/BaseClient.cs", "original/Game.Base/BaseClient.cs"],
  ["Game.Base/Statistics.cs", "original/Game.Base/Statistics.cs"],
  ["Game.Base/ClientEventHandle.cs", "original/Game.Base/ClientEventHandle.cs"],
  ["Game.Base/Packets/GSPacketIn.cs", "original/Game.Base/Packets/GSPacketIn.cs"],
  ["Game.Base/Packets/StreamProcessor.cs", "original/Game.Base/Packets/StreamProcessor.cs"],
  ["Game.Base/Base/Packets/FSM.cs", "original/Game.Base/Base/Packets/FSM.cs"],
  ["libdll/zlib.net.dll", "lib/zlib.net.dll"],
];
for (const [from, to] of files) {
  const dst = join(root, "csharp-oracle", to);
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(join(vendor, from), dst);
  console.log(`${from} -> csharp-oracle/${to}`);
}
