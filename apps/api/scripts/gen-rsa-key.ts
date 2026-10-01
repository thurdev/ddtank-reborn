/** Generates a 1024-bit RSA pair for the client login: prints RSA_PRIVATE_KEY (.NET XML) and the modulus to patch into 2.png. */
import { clientPublicKeyStrings, generateRsaKey, toDotNetRsaXml } from "@ddt/protocol";

const k = generateRsaKey(1024);
const pub = clientPublicKeyStrings(k);
console.log(`RSA_PRIVATE_KEY=${toDotNetRsaXml(k)}`);
console.log(`# client modulus (172 chars): ${pub.modulus}`);
console.log(`# patch: pnpm --filter @ddt/api patch-client-key <FlashSV1/2.png> <out/2.png> ${pub.modulus}`);
