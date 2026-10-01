/** Packet magic, first u16 of every frame. GSPacketIn.HEADER / PackageOut.HEADER (0x71AB). */
export const PACKET_HEADER = 29099;

/** Header size in bytes. GSPacketIn.HDR_SIZE / PackageIn.HEADER_SIZE. */
export const HDR_SIZE = 20;

/**
 * Size of the per-connection receive buffer and of every received GSPacketIn buffer
 * (BaseServer.GetNewClient / GameServer.AcquirePacketBuffer: new byte[8192]).
 * The server accepts frames whose length field is in [20, 8192] (StreamProcessor.ReceiveBytes).
 */
export const PACKET_BUFFER_SIZE = 8192;

/** Default capacity of a new outgoing GSPacketIn (GSPacketIn(short code) -> size 8192). */
export const DEFAULT_PACKET_CAPACITY = 8192;

/** Initial value of the checksum accumulator (GSPacketIn.checkSum / PackageOut.calculateCheckSum). */
export const CHECKSUM_SEED = 119;

/** Mask applied to the checksum. */
export const CHECKSUM_MASK = 0x7f7f;

/** First body byte included in the checksum (everything after the checksum field). */
export const CHECKSUM_START = 6;

/** Initial rolling key K0 (StreamProcessor.KEY / ByteSocket.KEY). */
export const DEFAULT_KEY: readonly number[] = Object.freeze([174, 191, 86, 120, 171, 205, 239, 241]);

/** FSM seeds used by both sides (StreamProcessor ctor / ByteSocket.handleConnect). Not used by the 4.1 cipher. */
export const FSM_DEFAULT_ADDER = 2059198199;
export const FSM_DEFAULT_MULTIPLIER = 1501;

/** `<policy-file-request/>\0` sent by Flash Player before opening a socket (23 bytes). */
export const POLICY_REQUEST = new Uint8Array([
  ...Array.from("<policy-file-request/>", (c) => c.charCodeAt(0)),
  0,
]);

/**
 * Exact policy answer of the game server (GameClient.POLICY, UTF-8, NUL-terminated).
 * Game.Server/GameClient.cs: Encoding.UTF8.GetBytes("<?xml ...></cross-domain-policy>\0")
 */
export const POLICY_XML =
  '<?xml version="1.0"?><!DOCTYPE cross-domain-policy SYSTEM "http://www.adobe.com/xml/dtds/cross-domain-policy.dtd"><cross-domain-policy><allow-access-from domain="*" to-ports="*" /></cross-domain-policy>\0';

/** POLICY_XML as bytes. */
export const POLICY_RESPONSE: Uint8Array = new TextEncoder().encode(POLICY_XML);

/** First byte that triggers the in-band policy answer ('<', GameClient.OnRecv: m_readBuffer[0] == 60). */
export const POLICY_TRIGGER_BYTE = 60;
