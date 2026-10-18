/**
 * Pix "copia e cola" (BR Code / EMV QR Code), gerado 100% localmente — sem PSP, sem rede.
 * Formato oficial: BACEN "Manual de Padrões para Iniciação do Pix" (arranjo "Pix", QR Code estático/dinâmico
 * sobre o padrão EMV MPM — ISO/IEC 18004 + especificação EMVCo "Merchant-Presented QR Code").
 * Usado pelo provedor "static" (`static.ts`, Pix direto com uma chave, sem webhook) e também pelo "fake"
 * (`fake.ts`), que gera um BR Code de aparência real pra testar a tela do site sem depender de rede.
 *
 * Estrutura: sequência de campos TLV (tag=2 dígitos, length=2 dígitos = nº de BYTES do valor, value),
 * concatenados em ordem fixa, terminando no CRC16 do próprio payload (incluindo o cabeçalho "6304" do campo
 * do CRC, mas sem o valor do CRC).
 */

/** Monta um campo TLV: id (2 dígitos) + tamanho do valor em bytes (2 dígitos) + valor. */
export function tlv(id: string, value: string): string {
  const len = Buffer.byteLength(value, "utf8");
  if (len > 99) throw new Error(`brcode: campo ${id} excede 99 bytes (${len})`);
  return `${id}${String(len).padStart(2, "0")}${value}`;
}

/**
 * CRC16/CCITT-FALSE: poly 0x1021, init 0xFFFF, sem reflexão, xorout 0 — exatamente o algoritmo exigido pelo
 * BACEN pro campo "63" do Pix. Vetor de validação conhecido (catálogo CRC "CRC-16/CCITT-FALSE"):
 * crc16ccitt("123456789") === "29B1" (ver teste em `pix-brcode.test.ts`).
 */
export function crc16ccitt(payload: string): string {
  let crc = 0xffff;
  const bytes = Buffer.from(payload, "utf8");
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Remove acentos e qualquer caractere fora do ASCII imprimível (Merchant Name/City exigem ASCII puro). */
export function toAscii(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e]/g, "")
    .trim();
}

export interface BrCodeInput {
  /** Chave Pix (e-mail, telefone +55DDDNUMERO, CPF/CNPJ só números, ou chave aleatória EVP). */
  pixKey: string;
  /** Nome do recebedor (truncado em 25 chars ASCII, por spec). */
  merchantName: string;
  /** Cidade do recebedor (truncado em 15 chars ASCII, por spec). */
  merchantCity: string;
  /** Valor fixo da cobrança, em centavos. Omitido = doador escolhe o valor no app do banco. */
  amountCents?: number;
  /** Identificador da cobrança (campo 62/05 "txid"); até 25 chars alfanuméricos. "***" = sem referência. */
  txid: string;
  /** Descrição opcional (campo 26/02), até 72 bytes. */
  description?: string;
}

/** Gera o payload Pix "copia e cola" (EMV) a partir de uma chave Pix + dados do recebedor. */
export function buildBrCode(input: BrCodeInput): string {
  const txid = toAscii(input.txid).replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const merchantAccount = tlv("00", "br.gov.bcb.pix") + tlv("01", input.pixKey) + (input.description ? tlv("02", input.description.slice(0, 72)) : "");

  let body = "";
  body += tlv("00", "01"); // Payload Format Indicator
  body += tlv("26", merchantAccount); // Merchant Account Information — Pix
  body += tlv("52", "0000"); // Merchant Category Code
  body += tlv("53", "986"); // Transaction Currency — BRL
  if (input.amountCents !== undefined) body += tlv("54", (input.amountCents / 100).toFixed(2));
  body += tlv("58", "BR"); // Country Code
  body += tlv("59", toAscii(input.merchantName).slice(0, 25) || "DOACAO"); // Merchant Name
  body += tlv("60", toAscii(input.merchantCity).slice(0, 15) || "BRASIL"); // Merchant City
  body += tlv("62", tlv("05", txid)); // Additional Data Field Template — Reference Label

  const withCrcHeader = `${body}6304`;
  return withCrcHeader + crc16ccitt(withCrcHeader);
}
