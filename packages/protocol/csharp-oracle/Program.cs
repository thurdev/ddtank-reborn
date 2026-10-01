// Golden-vector generator: drives the ORIGINAL Game.Base sources (./original) and writes
// ../test/golden/vectors.json. Everything random is seeded, so the output is reproducible.
using Game.Base;
using Game.Base.Packets;
using Road.Base.Packets;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Oracle
{
    /// BaseClient without a socket: we push bytes into PacketBuf and call OnRecv like RecvEventCallback does.
    public sealed class OracleClient : BaseClient
    {
        public readonly List<Dictionary<string, object>> Events = new();
        public Action<OracleClient, GSPacketIn> OnPacket;

        public OracleClient(bool encrypted) : base(new byte[8192], new byte[8192])
        {
            Encryted = encrypted;
        }

        public override void OnRecvPacket(GSPacketIn pkg)
        {
            Events.Add(new Dictionary<string, object>
            {
                ["type"] = "packet",
                ["code"] = (int)pkg.Code,
                ["clientId"] = pkg.ClientID,
                ["p1"] = pkg.Parameter1,
                ["p2"] = pkg.Parameter2,
                ["length"] = pkg.Length,
                ["bytes"] = Program.Hex(pkg.Buffer, 0, Math.Clamp(pkg.Length, 0, pkg.Buffer.Length)),
            });
            OnPacket?.Invoke(this, pkg);
        }

        public override void Disconnect()
        {
            Events.Add(new Dictionary<string, object> { ["type"] = "disconnect" });
        }

        /// Mirrors BaseClient.RecvEventCallback -> OnRecv(n): bytes are appended at PacketBufSize.
        /// A socket read can never return more than the free space (ReceiveAsyncImp: SetBuffer(buf, end, len - end)),
        /// so a larger chunk is delivered as several reads.
        public void Feed(byte[] data, int off, int len)
        {
            while (len > 0)
            {
                int free = PacketBuf.Length - PacketBufSize;
                if (free <= 0)
                {
                    Events.Add(new Dictionary<string, object> { ["type"] = "overflow" });
                    return;
                }
                int n = Math.Min(free, len);
                System.Buffer.BlockCopy(data, off, PacketBuf, PacketBufSize, n);
                OnRecv(n);
                off += n;
                len -= n;
            }
        }

        /// Mirrors StreamProcessor.SendTCP + AsyncTcpSendCallback (assuming every SendAsync fully succeeds).
        public byte[] SimulateSend(IEnumerable<GSPacketIn> packets)
        {
            var queue = new Queue<PacketIn>();
            foreach (var p in packets)
            {
                p.WriteHeader();
                p.Offset = 0;
                queue.Enqueue(p);
            }
            var output = new MemoryStream();
            byte[] buf = SendBuffer;
            int firstPkgOffset = 0;
            while (queue.Count > 0)
            {
                int length = 0;
                do
                {
                    PacketIn pin = queue.Peek();
                    int n = !Encryted ? pin.CopyTo(buf, length, firstPkgOffset) : pin.CopyTo3(buf, length, firstPkgOffset, SEND_KEY, ref numPacketProcces);
                    firstPkgOffset += n;
                    length += n;
                    if (pin.Length <= firstPkgOffset)
                    {
                        queue.Dequeue();
                        firstPkgOffset = 0;
                        if (Encryted) pin.isSended = true;
                    }
                    if (buf.Length == length) break;
                } while (queue.Count > 0);
                output.Write(buf, 0, length);
            }
            return output.ToArray();
        }
    }

    public static class Program
    {
        static readonly Random Rng = new Random(20261001);

        public static string Hex(byte[] b, int off, int len)
        {
            var sb = new StringBuilder(len * 2);
            for (int i = off; i < off + len; i++) sb.Append(b[i].ToString("x2"));
            return sb.ToString();
        }
        public static string Hex(byte[] b) => Hex(b, 0, b.Length);
        static byte[] FromHex(string h) => Convert.FromHexString(h);

        static byte[] RandBytes(int n)
        {
            var b = new byte[n];
            Rng.NextBytes(b);
            return b;
        }

        static byte[] PacketBytes(GSPacketIn p)
        {
            p.WriteHeader();
            return p.Buffer.Take(p.Length).ToArray();
        }

        static GSPacketIn RandomPacket(int maxBody)
        {
            var p = new GSPacketIn((short)Rng.Next(0, 512), Rng.Next(int.MinValue, int.MaxValue));
            p.Parameter1 = Rng.Next(int.MinValue, int.MaxValue);
            p.Parameter2 = Rng.Next(-1000, 1000);
            p.Write(RandBytes(Rng.Next(0, maxBody + 1)));
            return p;
        }

        // ---------------------------------------------------------------- primitives (write side)
        static object Primitives()
        {
            var cases = new List<object>();

            void Case(string name, short code, int clientId, int p1, int p2, List<object[]> ops)
            {
                var p = new GSPacketIn(code, clientId);
                p.Parameter1 = p1;
                p.Parameter2 = p2;
                foreach (var op in ops)
                {
                    string kind = (string)op[0];
                    object v = op[1];
                    switch (kind)
                    {
                        case "byte": p.WriteByte((byte)(int)v); break;
                        case "bool": p.WriteBoolean((bool)v); break;
                        case "short": p.WriteShort((short)(int)v); break;
                        case "shortLE": p.WriteShortLowEndian((short)(int)v); break;
                        case "int": p.WriteInt((int)v); break;
                        case "uint": p.vmethod_0((uint)(long)v); break;
                        case "long": p.WriteLong(long.Parse((string)v)); break;
                        case "float": p.WriteFloat((float)(double)v); break;
                        case "double": p.WriteDouble((double)v); break;
                        case "string": p.WriteString((string)v); break;
                        case "stringMax": { var a = (object[])v; p.WriteString((string)a[0], (int)a[1]); break; }
                        case "date": { var a = (int[])v; p.WriteDateTime(new DateTime(a[0], a[1], a[2], a[3], a[4], a[5])); break; }
                        case "bytes": p.Write(FromHex((string)v)); break;
                        case "fill": { var a = (int[])v; p.Fill((byte)a[0], a[1]); break; }
                        default: throw new Exception(kind);
                    }
                }
                var bytes = PacketBytes(p);
                var jsonOps = ops.Select(o => new object[] { o[0], o[1] }).ToList();
                cases.Add(new { name, code = (int)code, clientId, p1, p2, ops = jsonOps, bytes = Hex(bytes) });
            }

            Case("empty", 4, 0, 0, 0, new List<object[]>());
            Case("ints", 91, 123456, -1, 7, new List<object[]>
            {
                new object[] { "byte", 0 }, new object[] { "byte", 255 }, new object[] { "bool", true }, new object[] { "bool", false },
                new object[] { "short", -1 }, new object[] { "short", 32767 }, new object[] { "short", -32768 }, new object[] { "short", 0x1234 },
                new object[] { "shortLE", 0x1234 }, new object[] { "shortLE", -2 },
                new object[] { "int", int.MinValue }, new object[] { "int", int.MaxValue }, new object[] { "int", -123456789 }, new object[] { "int", 0 },
                new object[] { "uint", 4294967295L }, new object[] { "uint", 2147483648L }, new object[] { "uint", 1L },
            });
            var longs = new[] { "0", "1", "-1", "4294967295", "4294967296", "8589934592", "12884901888", "-4294967296", "-4294967297",
                "9223372036854775807", "-9223372036854775808", "1234567890123", "-1234567890123", "2147483648", "-2147483648", "6442450945" };
            Case("longs", 1, 1, 2, 3, longs.Select(s => new object[] { "long", s }).ToList());
            Case("floats", 2, 0, 0, 0, new List<object[]>
            {
                new object[] { "float", 0.0 }, new object[] { "float", -0.0 }, new object[] { "float", 1.5 }, new object[] { "float", -0.1 },
                new object[] { "float", 3.4028234663852886e38 }, new object[] { "float", 1e-45 }, new object[] { "float", 123456.789 },
                new object[] { "double", 0.0 }, new object[] { "double", 1.0 }, new object[] { "double", -0.1 }, new object[] { "double", 1.7976931348623157e308 },
                new object[] { "double", 5e-324 }, new object[] { "double", Math.PI },
            });
            Case("strings", 3, 9, 0, 0, new List<object[]>
            {
                new object[] { "string", "" }, new object[] { "string", null }, new object[] { "string", "abc" }, new object[] { "string", "Xin chào Việt Nam" },
                new object[] { "string", "弹弹堂" }, new object[] { "string", "emoji 😀!" }, new object[] { "string", "a\0b" }, new object[] { "string", "lone \ud800 surrogate" },
                new object[] { "stringMax", new object[] { "hello world", 5 } }, new object[] { "stringMax", new object[] { "弹弹堂", 4 } }, new object[] { "stringMax", new object[] { "ab", 10 } },
                new object[] { "string", new string('x', 300) },
            });
            Case("dates", 5, 0, 0, 0, new List<object[]>
            {
                new object[] { "date", new[] { 2026, 10, 1, 18, 39, 5 } }, new object[] { "date", new[] { 1, 1, 1, 0, 0, 0 } }, new object[] { "date", new[] { 9999, 12, 31, 23, 59, 59 } },
            });
            Case("bytes+fill", 300, -5, 0, 0, new List<object[]>
            {
                new object[] { "bytes", "00ff10203040" }, new object[] { "fill", new[] { 0xAB, 5 } },
            });
            // Body larger than the 8192 initial buffer (Write() grows the buffer).
            Case("big", 77, 0, 0, 0, new List<object[]> { new object[] { "bytes", Hex(RandBytes(9000)) } });
            return cases;
        }

        // ---------------------------------------------------------------- primitives (read side)
        static object Reads()
        {
            var list = new List<object>();
            // ReadLong on arbitrary (high, low) pairs: exercises the double-based reconstruction.
            var longReads = new List<object>();
            var pairs = new List<(int, uint)>
            {
                (0, 0), (0, 1), (0, 0xFFFFFFFF), (1, 0), (1, 5), (-1, 0), (-1, 1), (-1, 0xFFFFFFFF), (int.MaxValue, 0xFFFFFFFF),
                (int.MinValue, 0), (int.MinValue, 1), (int.MinValue, 1024), (int.MinValue, 1025), (int.MinValue, 0xFFFFFFFF), (0x200000, 1), (0x200000, 0xFFFFFFFF),
                (-0x200000, 3), (12345, 67890),
            };
            for (int i = 0; i < 40; i++) pairs.Add((Rng.Next(int.MinValue, int.MaxValue), (uint)Rng.NextInt64(0, 0x100000000L)));
            foreach (var (hi, lo) in pairs)
            {
                var b = new byte[8];
                var w = new PacketIn(b, 0);
                w.WriteInt(hi);
                w.WriteInt((int)lo);
                var r = new PacketIn(b, 8);
                long v = r.ReadLong();
                longReads.Add(new { bytes = Hex(b), value = v.ToString() });
            }
            // ReadString: NUL stripping, invalid UTF-8 replacement.
            var stringReads = new List<object>();
            foreach (var hex in new[] { "000161", "0000", "000400616200", "0003616263", "0006e5bcb9e5bcb9", "0004ff6162c3", "0005e5bc61ed00", "00080061006200630000", "0003c0afe0", "0004f0908080" })
            {
                var b = FromHex(hex);
                var r = new PacketIn(b, b.Length);
                string s = r.ReadString();
                stringReads.Add(new { bytes = hex, value = s, codepoints = s.Select(c => (int)c).ToArray(), offset = r.Offset });
            }
            // ReadFloat/ReadDouble/ReadDateTime/ReadShortLowEndian/ReadUInt/ReadBoolean.
            var misc = new List<object>();
            {
                var b = FromHex("0000c03f" + "cdcccc3d" + "9a9999999999b93f" + "07ea0a0112270502" + "3412" + "fffffffe" + "02");
                var r = new PacketIn(b, b.Length);
                misc.Add(new
                {
                    bytes = Hex(b),
                    f1 = (double)r.ReadFloat(),
                    f2 = (double)r.ReadFloat(),
                    d = r.ReadDouble(),
                    date = new Func<int[]>(() => { var d = r.ReadDateTime(); return new[] { d.Year, d.Month, d.Day, d.Hour, d.Minute, d.Second }; })(),
                    shortLE = (int)r.ReadShortLowEndian(),
                    u = (long)r.ReadUInt(),
                    flag = r.ReadBoolean(),
                });
            }
            return new { longReads, stringReads, misc };
        }

        // ---------------------------------------------------------------- checksum / header
        static object Checksums()
        {
            var list = new List<object>();
            for (int i = 0; i < 60; i++)
            {
                var p = RandomPacket(i < 50 ? 64 : 3000);
                var bytes = PacketBytes(p);
                list.Add(new { code = (int)p.Code, clientId = p.ClientID, p1 = p.Parameter1, p2 = p.Parameter2, body = Hex(bytes, 20, bytes.Length - 20), bytes = Hex(bytes), checksum = (int)p.checkSum() });
            }
            // all-0xFF body: wraps the 16-bit accumulator many times.
            {
                var p = new GSPacketIn(32767, -1);
                p.Parameter1 = -1; p.Parameter2 = -1;
                p.Fill(0xFF, 8000);
                var bytes = PacketBytes(p);
                list.Add(new { code = (int)p.Code, clientId = p.ClientID, p1 = p.Parameter1, p2 = p.Parameter2, body = Hex(bytes, 20, bytes.Length - 20), bytes = Hex(bytes), checksum = (int)p.checkSum() });
            }
            return list;
        }

        // ---------------------------------------------------------------- server send path (CopyTo3)
        static object SendStreams()
        {
            var list = new List<object>();
            foreach (var (name, enc, key, count, maxBody) in new[]
            {
                ("plain-small", false, (byte[])null, 10, 100),
                ("enc-K0-small", true, (byte[])null, 10, 100),
                ("enc-custom-key", true, new byte[] { 1, 2, 3, 4, 250, 251, 252, 253 }, 20, 200),
                ("enc-K0-spanning-8192", true, (byte[])null, 12, 3000), // forces packets to straddle send-buffer refills
                ("plain-spanning-8192", false, (byte[])null, 12, 3000),
            })
            {
                var c = new OracleClient(enc);
                if (key != null) c.setKey(key);
                var keyBefore = Hex(c.SEND_KEY);
                var packets = Enumerable.Range(0, count).Select(_ => RandomPacket(maxBody)).ToList();
                var plains = packets.Select(PacketBytes).Select(b => Hex(b)).ToList();
                var wire = c.SimulateSend(packets);
                list.Add(new { name, encrypted = enc, key = keyBefore, packets = plains, wire = Hex(wire), keyAfter = Hex(c.SEND_KEY) });
            }
            return list;
        }

        // ---------------------------------------------------------------- server receive path (ReceiveBytes)
        static List<int> RandomChunks(int total, int max)
        {
            var chunks = new List<int>();
            int left = total;
            while (left > 0)
            {
                int n = Math.Min(left, Rng.Next(1, max + 1));
                chunks.Add(n);
                left -= n;
            }
            return chunks;
        }

        static object RecvCase(string name, bool enc, byte[] key, byte[] wire, List<int> chunks)
        {
            var c = new OracleClient(enc);
            if (key != null) c.setKey(key);
            var keyBefore = Hex(c.RECEIVE_KEY);
            int off = 0;
            foreach (int n in chunks)
            {
                c.Feed(wire, off, n);
                off += n;
            }
            return new { name, encrypted = enc, key = keyBefore, wire = Hex(wire), chunks, events = c.Events, keyAfter = Hex(c.RECEIVE_KEY), pending = c.PacketBufSize, pendingBytes = Hex(c.PacketBuf, 0, c.PacketBufSize) };
        }

        static byte[] ClientWire(bool enc, byte[] key, IEnumerable<GSPacketIn> packets)
        {
            // The client-side cipher is the same algorithm as the server's send cipher (ByteSocket.send).
            var sender = new OracleClient(enc);
            if (key != null) sender.setKey(key);
            return sender.SimulateSend(packets);
        }

        static object RecvStreams()
        {
            var list = new List<object>();
            for (int round = 0; round < 6; round++)
            {
                bool enc = round % 2 == 1;
                var packets = Enumerable.Range(0, 15).Select(_ => RandomPacket(round < 4 ? 120 : 1500)).ToList();
                var wire = ClientWire(enc, null, packets);
                list.Add(RecvCase($"random-split-{round}", enc, null, wire, RandomChunks(wire.Length, round < 2 ? 7 : 400)));
            }
            {
                // whole stream in single-byte chunks
                var packets = Enumerable.Range(0, 4).Select(_ => RandomPacket(40)).ToList();
                var wire = ClientWire(true, null, packets);
                list.Add(RecvCase("byte-by-byte-enc", true, null, wire, Enumerable.Repeat(1, wire.Length).ToList()));
            }
            {
                // garbage before / between packets (resync by scanning for 0x71AB), plaintext
                var a = PacketBytes(RandomPacket(30));
                var b = PacketBytes(RandomPacket(30));
                var wire = RandBytes(7).Concat(a).Concat(new byte[] { 0x71, 0x00, 0x13 }).Concat(b).ToArray();
                list.Add(RecvCase("garbage-plain", false, null, wire, new List<int> { wire.Length }));
            }
            {
                // garbage in front of an encrypted stream: the scan uses a CLONE of the key, so it still resyncs
                var packets = Enumerable.Range(0, 3).Select(_ => RandomPacket(30)).ToList();
                var wire = RandBytes(5).Concat(ClientWire(true, null, packets)).ToArray();
                list.Add(RecvCase("garbage-enc", true, null, wire, new List<int> { wire.Length }));
            }
            {
                // header with an invalid length (< 20) -> buffer dropped + Disconnect() (Strict)
                var bad = FromHex("71ab0010000000000000000000000000000000000000");
                list.Add(RecvCase("bad-length-small", false, null, bad, new List<int> { bad.Length }));
                var big = FromHex("71ab2001000000000000000000000000000000000000");
                list.Add(RecvCase("bad-length-big", false, null, big, new List<int> { big.Length }));
            }
            {
                // partial tails left in the buffer
                var p = PacketBytes(RandomPacket(50));
                var wire = p.Concat(p.Take(13)).ToArray();
                list.Add(RecvCase("partial-tail", false, null, wire, new List<int> { wire.Length }));
                var wire2 = p.Concat(p.Take(1)).ToArray();
                list.Add(RecvCase("one-byte-tail", false, null, wire2, new List<int> { wire2.Length }));
                var wire3 = p.Concat(p.Take(25)).ToArray();
                list.Add(RecvCase("header-tail", false, null, wire3, new List<int> { wire3.Length }));
            }
            {
                // custom key (post-login)
                var key = new byte[] { 9, 8, 7, 6, 5, 4, 3, 2 };
                var packets = Enumerable.Range(0, 8).Select(_ => RandomPacket(200)).ToList();
                var wire = ClientWire(true, key, packets);
                list.Add(RecvCase("enc-custom-key", true, key, wire, RandomChunks(wire.Length, 64)));
            }
            {
                // largest legal frame (8191) and the 8192 quirk (CopyFrom refuses count == buffer length)
                var p = new GSPacketIn(10, 1);
                p.Write(RandBytes(8191 - 20));
                var wire = PacketBytes(p);
                list.Add(RecvCase("frame-8191", false, null, wire, RandomChunks(wire.Length, 2000)));
                var q = new GSPacketIn(11, 2);
                q.Write(RandBytes(8192 - 20));
                var tail = PacketBytes(RandomPacket(20));
                var wireQ = PacketBytes(q).Concat(tail).ToArray();
                list.Add(RecvCase("frame-8192-quirk-plain", false, null, wireQ, new List<int> { 8000, wireQ.Length - 8000 }));
                var wireQe = ClientWire(true, null, new[] { q, RandomPacket(20) });
                list.Add(RecvCase("frame-8192-quirk-enc", true, null, wireQe, new List<int> { 5000, wireQe.Length - 5000 }));
            }
            {
                // encrypted junk: the scan key clone is taken ONCE per scan and mutated by every failed attempt
                var packets = Enumerable.Range(0, 3).Select(_ => RandomPacket(30)).ToList();
                var enc = ClientWire(true, null, packets);
                var wire = RandBytes(3).Concat(enc).ToArray();
                list.Add(RecvCase("garbage-enc-split", true, null, wire, new List<int> { 6, 10, wire.Length - 16 }));
                list.Add(RecvCase("garbage-enc-bytewise", true, null, wire, Enumerable.Repeat(1, wire.Length).ToList()));
            }
            return list;
        }

        // ---------------------------------------------------------------- FSM (ported but unused by the 4.1 cipher)
        static object Fsm()
        {
            var list = new List<object>();
            foreach (var (a, m) in new[] { (2059198199, 1501), (12345, 777), (-5, 3) })
            {
                var f = new FSM(a, m, "x");
                var states = new List<int> { f.getState() };
                for (int i = 0; i < 20; i++) states.Add(f.UpdateState());
                list.Add(new { adder = a, multiplier = m, states });
            }
            return list;
        }

        // ---------------------------------------------------------------- RSA login (UserLoginHandler) end-to-end
        static object Rsa()
        {
            var rsa = new RSACryptoServiceProvider(1024);
            string xml = rsa.ToXmlString(true);
            var cases = new List<object>();
            var sessions = new List<object>();
            for (int i = 0; i < 3; i++)
            {
                // client side: GameSocketOut.sendLogin
                var plain = new MemoryStream();
                var date = new byte[] { 0x07, 0xEA, 10, 1, 18, 39, (byte)(5 + i) };
                plain.Write(date);
                var key = RandBytes(8);
                plain.Write(key);
                string user = i == 2 ? "usuário_ção" : "player" + i;
                string pass = "k" + Hex(RandBytes(8));
                plain.Write(Encoding.UTF8.GetBytes(user + "," + pass));
                var cipher = rsa.Encrypt(plain.ToArray(), false);
                cases.Add(new { plaintext = Hex(plain.ToArray()), ciphertext = Hex(cipher), key = Hex(key), user, pass });

                // full session: LOGIN under K0, then two packets under the new key, received in random chunks
                var login = new GSPacketIn(1);
                login.WriteInt(5498); // Version.Build
                login.WriteInt(0);    // desktopType
                login.Write(cipher);
                var p2 = RandomPacket(60);
                var p3 = RandomPacket(60);
                var w1 = ClientWire(true, null, new[] { login });
                var w2 = ClientWire(true, key, new[] { p2, p3 });
                var wire = w1.Concat(w2).ToArray();
                var srv = new OracleClient(true);
                srv.OnPacket = (cl, pkg) =>
                {
                    if (pkg.Code != 1) return;
                    // UserLoginHandler.HandlePacket (key part)
                    pkg.ReadInt();
                    pkg.ReadInt();
                    byte[] src = rsa.Decrypt(pkg.ReadBytes(), false);
                    byte[] tempKey = new byte[8];
                    for (int k = 0; k < 8; k++) tempKey[k] = src[k + 7];
                    cl.setKey(tempKey);
                };
                var chunks = RandomChunks(wire.Length, 90);
                int off = 0;
                foreach (int n in chunks) { srv.Feed(wire, off, n); off += n; }
                sessions.Add(new { wire = Hex(wire), chunks, events = srv.Events, recvKeyAfter = Hex(srv.RECEIVE_KEY) });
            }
            // inter-server: Center/Fighting send RSAKey (code 0) = modulus(128) + exponent; Game replies code 1 = RSA("serverid,name")
            var ps = rsa.ExportParameters(false);
            var rsaKeyPkt = new GSPacketIn(0);
            rsaKeyPkt.Write(ps.Modulus);
            rsaKeyPkt.Write(ps.Exponent);
            return new { privateKeyXml = xml, logins = cases, sessions, interServerRsaKeyPacket = Hex(PacketBytes(rsaKeyPkt)) };
        }

        // ---------------------------------------------------------------- zlib (Marshal.Compress / GSPacketIn.Compress)
        static object Compression()
        {
            var list = new List<object>();
            var inputs = new List<byte[]>
            {
                new byte[0],
                Encoding.UTF8.GetBytes("hello hello hello hello"),
                Encoding.UTF8.GetBytes(string.Concat(Enumerable.Range(0, 400).Select(i => $"<Item ID=\"{i}\" Name=\"x{i % 7}\" />"))),
                RandBytes(500),
            };
            foreach (var input in inputs)
            {
                var c = Marshal.Compress(input);
                list.Add(new { input = Hex(input), compressed = Hex(c), roundtrip = Hex(Marshal.Uncompress(c)) == Hex(input) });
            }
            var p = new GSPacketIn(66, 42);
            p.WriteInt(7);
            p.WriteString("compressed body " + new string('z', 200));
            var before = Hex(p.Buffer, 0, p.Length);
            p.Compress();
            var after = PacketBytes(p);
            return new { marshal = list, packet = new { before, after = Hex(after) } };
        }

        public static int Main(string[] args)
        {
            string outPath = args.Length > 0 ? args[0] : Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../test/golden/vectors.json"));
            var root = new Dictionary<string, object>
            {
                ["generator"] = "packages/protocol/csharp-oracle (original DDTank41 Game.Base sources)",
                ["K0"] = Hex(StreamProcessor.KEY),
                ["primitives"] = Primitives(),
                ["reads"] = Reads(),
                ["checksums"] = Checksums(),
                ["send"] = SendStreams(),
                ["recv"] = RecvStreams(),
                ["fsm"] = Fsm(),
                ["rsa"] = Rsa(),
                ["zlib"] = Compression(),
            };
            var json = JsonSerializer.Serialize(root, new JsonSerializerOptions
            {
                WriteIndented = false,
                Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
                NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowNamedFloatingPointLiterals,
            });
            Directory.CreateDirectory(Path.GetDirectoryName(outPath));
            File.WriteAllText(outPath, json);
            Console.WriteLine($"wrote {outPath} ({json.Length} chars)");
            return 0;
        }
    }
}
