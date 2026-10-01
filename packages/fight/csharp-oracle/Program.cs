// Golden-vector generator for @ddt/fight. Drives the ORIGINAL Game.Logic code in ./original (Tile, Map, Physics,
// BombObject, EulerVector, and verbatim-extracted SimpleBomb/Living/TurnedLiving/BaseGame/WindMgr methods) on the real
// map/bomb files and the real Ball/Game_Map seed rows, and writes ../test/golden/vectors.json. Everything is seeded.
using Game.Logic;
using Game.Logic.Phy.Actions;
using Game.Logic.Phy.Maps;
using Game.Logic.Phy.Object;
using SqlDataProvider.Data;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Security.Cryptography;
using System.Text.Json;

namespace Oracle
{
    public static class Program
    {
        static string PkgDir([CallerFilePath] string p = "") => Path.GetFullPath(Path.Combine(Path.GetDirectoryName(p), ".."));

        static string Assets;
        static Dictionary<int, BallInfo> Balls;
        static Dictionary<int, JsonElement> MapRows = new();
        static readonly Dictionary<int, (Tile fore, Tile dead)> MapCache = new();

        static T[] ReadSeed<T>(string table)
        {
            var path = Path.Combine(PkgDir(), "../db/seed/game", table + ".json.gz");
            using var gz = new GZipStream(File.OpenRead(path), CompressionMode.Decompress);
            return JsonSerializer.Deserialize<T[]>(gz);
        }

        static string Hash(byte[] d) => Convert.ToHexString(SHA256.HashData(d)).ToLowerInvariant();

        static Tile LoadTile(string path, bool digable) => File.Exists(path) ? new Tile(path, digable) : null;

        static Map LoadMap(int id)
        {
            if (!MapCache.TryGetValue(id, out var t))
            {
                t = (LoadTile(Path.Combine(Assets, "map", id.ToString(), "fore.map"), true), LoadTile(Path.Combine(Assets, "map", id.ToString(), "dead.map"), false));
                MapCache[id] = t;
            }
            var row = MapRows[id];
            var info = new MapInfo { Weight = row.GetProperty("Weight").GetInt32(), DragIndex = row.GetProperty("DragIndex").GetInt32() };
            return new Map(info, t.fore?.Clone(), t.dead?.Clone());
        }

        static Tile Shape(int ballId)
        {
            var p = Path.Combine(Assets, "bomb", ballId + ".bomb");
            return Balls[ballId].HasTunnel && File.Exists(p) ? new Tile(p, false) : null;
        }

        static object Act(BombAction a) => new[] { a.TimeInt, a.Type, a.Param1, a.Param2, a.Param3, a.Param4 };

        public static void Main(string[] args)
        {
            Assets = args.Length > 0 ? args[0] : Environment.GetEnvironmentVariable("DDT_FIGHT_ASSETS") ?? Path.Combine(PkgDir(), "../../vendor/DDTank41/Fighting.Service/bin/Debug/net48");
            Balls = ReadSeed<BallInfo>("Ball").GroupBy(b => b.ID).ToDictionary(g => g.Key, g => g.First());
            foreach (var b in Balls.Values) BallMgr.Balls[b.ID] = b;
            foreach (var r in ReadSeed<JsonElement>("Game_Map")) MapRows[r.GetProperty("ID").GetInt32()] = r;

            var outp = new Dictionary<string, object>
            {
                ["random"] = RandomVectors(),
                ["wind"] = WindVectors(),
                ["vane"] = Enumerable.Range(-50, 101).Select(w => new[] { w, (int)new BaseGame().GetVane(w, 1), (int)new BaseGame().GetVane(w, 2), (int)new BaseGame().GetVane(w, 3) }).ToArray(),
                ["turnTime"] = Enumerable.Range(0, 8).Select(t => new[] { t, new BaseGame { m_timeType = t }.getTurnTime() }).ToArray(),
                ["turnDelay"] = TurnDelayVectors(),
                ["euler"] = EulerVectors(),
                ["digs"] = DigVectors(),
                ["walk"] = WalkVectors(),
                ["trajectories"] = TrajectoryVectors(),
                ["damage"] = DamageVectors(),
                ["crit"] = CritVectors(),
                ["aim"] = AimVectors(),
            };
            var file = Path.Combine(PkgDir(), "test/golden/vectors.json");
            Directory.CreateDirectory(Path.GetDirectoryName(file));
            File.WriteAllText(file, JsonSerializer.Serialize(outp, new JsonSerializerOptions { WriteIndented = false }));
            Console.WriteLine("wrote " + file);
        }

        static object RandomVectors()
        {
            var list = new List<object>();
            foreach (var seed in new[] { 0, 1, 42, 12345, -7, int.MaxValue, int.MinValue, 20261001 })
            {
                var r = new Random(seed);
                list.Add(new Dictionary<string, object>
                {
                    ["seed"] = seed,
                    ["next"] = Enumerable.Range(0, 8).Select(_ => r.Next()).ToArray(),
                    ["max100"] = Enumerable.Range(0, 16).Select(_ => r.Next(100)).ToArray(),
                    ["range"] = Enumerable.Range(0, 16).Select(_ => r.Next(-40, 40)).ToArray(),
                    ["dbl"] = Enumerable.Range(0, 4).Select(_ => r.NextDouble()).ToArray(),
                });
            }
            return list;
        }

        static object WindVectors()
        {
            var list = new List<object>();
            foreach (var seed in new[] { 1, 7, 99, 2026 })
            {
                var g = new BaseGame { m_random = new Random(seed), m_nextWind = 0, Wind = 0f };
                var seq = new List<float>();
                for (int i = 0; i < 40; i++)
                {
                    g.Wind = g.GetNextWind();
                    seq.Add(g.Wind);
                }
                list.Add(new Dictionary<string, object> { ["seed"] = seed, ["seq"] = seq });
            }
            return list;
        }

        static object TurnDelayVectors()
        {
            var r = new Random(5);
            return Enumerable.Range(0, 30).Select(_ =>
            {
                var p = new Player(1, new BaseGame(), 1) { Agility = r.Next(0, 3000), Attack = r.Next(0, 3000) };
                return new[] { p.Agility, p.Attack, p.GetTurnDelay() };
            }).ToArray();
        }

        static object EulerVectors()
        {
            var r = new Random(11);
            var list = new List<object>();
            for (int k = 0; k < 10; k++)
            {
                int x0 = r.Next(0, 2000), x1 = r.Next(-1500, 1500); float f = r.Next(-1200, 7000);
                var v = new Game.Logic.Phy.Maths.EulerVector(x0, x1, 0f);
                var steps = new List<float[]>();
                for (int i = 0; i < 50; i++) { v.ComputeOneEulerStep(10f, 2f, f, 0.04f); steps.Add(new[] { v.x0, v.x1, v.x2 }); }
                list.Add(new Dictionary<string, object> { ["init"] = new[] { x0, x1 }, ["f"] = f, ["steps"] = steps });
            }
            return list;
        }

        static readonly int[] MapIds = { 1001, 1002, 1003, 1010, 1099, 1458 };

        static object DigVectors()
        {
            var list = new List<object>();
            var r = new Random(77);
            int[] balls = { 4, 6, 9, 11, 13, 16, 11213 };
            foreach (var id in MapIds.Take(4))
            {
                var map = LoadMap(id);
                var ops = new List<object>();
                for (int i = 0; i < 12; i++)
                {
                    int ball = balls[r.Next(balls.Length)];
                    var shape = Shape(ball);
                    // include edges / out-of-bounds centres
                    int cx = i % 4 == 0 ? r.Next(-60, 60) : i % 4 == 1 ? map.Bound.Width - r.Next(-60, 60) : r.Next(0, map.Bound.Width);
                    int cy = i % 5 == 0 ? r.Next(-60, 60) : i % 5 == 1 ? map.Bound.Height - r.Next(-60, 60) : r.Next(0, map.Bound.Height);
                    map.Dig(cx, cy, shape, null);
                    ops.Add(new Dictionary<string, object> { ["ball"] = ball, ["cx"] = cx, ["cy"] = cy, ["fore"] = Hash(map.Ground.Data) });
                }
                list.Add(new Dictionary<string, object> { ["mapId"] = id, ["initial"] = Hash(LoadMap(id).Ground.Data), ["ops"] = ops });
            }
            return list;
        }

        static object WalkVectors()
        {
            var list = new List<object>();
            var r = new Random(3);
            foreach (var id in MapIds)
            {
                var map = LoadMap(id);
                for (int i = 0; i < 12; i++)
                {
                    int x = r.Next(0, map.Bound.Width), y = r.Next(-50, map.Bound.Height);
                    var down = map.FindYLineNotEmptyPointDown(x, y);
                    var up = map.FindYLineNotEmptyPointUp(x, y, 200);
                    var walk = new List<int[]>();
                    var p = down;
                    int dir = r.Next(2) == 0 ? 1 : -1;
                    for (int s = 0; s < 30 && !p.IsEmpty; s++)
                    {
                        p = map.FindNextWalkPoint(p.X, p.Y, dir, 3, 7);
                        walk.Add(new[] { p.X, p.Y });
                    }
                    list.Add(new Dictionary<string, object> { ["mapId"] = id, ["x"] = x, ["y"] = y, ["dir"] = dir, ["down"] = new[] { down.X, down.Y }, ["up"] = new[] { up.X, up.Y }, ["walk"] = walk });
                }
            }
            return list;
        }

        static Point Ground(Map map, Random r)
        {
            for (int k = 0; k < 200; k++)
            {
                int x = r.Next(60, map.Bound.Width - 60);
                var p = map.FindYLineNotEmptyPointDown(x, 0);
                if (!p.IsEmpty && p.Y > 60) return p;
            }
            return new Point(map.Bound.Width / 2, 100);
        }

        static object TrajectoryVectors()
        {
            var list = new List<object>();
            var r = new Random(20261001);
            int[] balls = { 4, 6, 9, 11, 13, 16, 11213, 1, 3, 0 };
            for (int c = 0; c < 36; c++)
            {
                int mapId = MapIds[c % MapIds.Length];
                var map = LoadMap(mapId);
                int wind10 = r.Next(-50, 51);
                map.wind = wind10 / 10f;
                var game = new BaseGame { m_random = new Random(c), Map = map };
                int ballId = balls[r.Next(balls.Length)];
                var ball = Balls[ballId];
                var shooterPos = Ground(map, r);
                var shooter = new Player(1, game, 1);
                shooter.SetXY(shooterPos.X, shooterPos.Y);
                map.AddPhysical(shooter);
                var targets = new List<object>();
                int nt = r.Next(0, 3);
                for (int t = 0; t < nt; t++)
                {
                    var tp = Ground(map, r);
                    var target = new Player(10 + t, game, t == 1 ? 1 : 2);
                    target.SetXY(tp.X, tp.Y);
                    map.AddPhysical(target);
                    targets.Add(new[] { target.Id, tp.X, tp.Y, target.Team });
                }
                int dir = r.Next(2) == 0 ? 1 : -1;
                shooter.Direction = dir;
                var muzzle = shooter.GetShootPoint();
                int elev = r.Next(5, 86);
                int angle = dir == 1 ? -elev : -180 + elev;
                int force = r.Next(200, 2001);
                int bombCount = r.Next(4) == 0 ? 3 : 1;
                bool controlled = r.Next(7) == 0;
                var bombs = new List<object>();
                for (int i = 0; i < bombCount; i++)
                {
                    // Living.ShootImp, Living.cs:1784-1803 (copied lines)
                    double num3 = 1.0; int num4 = 0;
                    switch (i) { case 2: num3 = 1.1; num4 = 5; break; case 1: num3 = 0.9; num4 = -5; break; }
                    int vx = (int)((double)force * num3 * Math.Cos((double)(angle + num4) / 180.0 * Math.PI));
                    int vy = (int)((double)force * num3 * Math.Sin((double)(angle + num4) / 180.0 * Math.PI));
                    var bomb = new SimpleBomb(100 + i, BallMgrType(ballId), shooter, game, ball, Shape(ballId), controlled, angle);
                    bomb.SetXY(muzzle.X, muzzle.Y);
                    bomb.setSpeedXY(vx, vy);
                    map.AddPhysical(bomb);
                    game.TempPoints.Clear();
                    bomb.StartMoving();
                    bombs.Add(new Dictionary<string, object>
                    {
                        ["vx"] = vx, ["vy"] = vy, ["x"] = bomb.X, ["y"] = bomb.Y, ["lifeTime"] = bomb.LifeTime, ["digMap"] = bomb.DigMap,
                        ["actions"] = bomb.Actions.Select(Act).ToArray(),
                        ["victims"] = bomb.Victims.Select(v => v.Id).ToArray(),
                        ["temp"] = game.TempPoints.Select(p => new[] { p.X, p.Y }).ToArray(),
                        ["fore"] = map.Ground != null ? Hash(map.Ground.Data) : "",
                    });
                }
                list.Add(new Dictionary<string, object>
                {
                    ["mapId"] = mapId, ["wind10"] = wind10, ["ballId"] = ballId, ["shooter"] = new[] { shooterPos.X, shooterPos.Y, dir },
                    ["muzzle"] = new[] { muzzle.X, muzzle.Y }, ["targets"] = targets, ["angle"] = angle, ["force"] = force,
                    ["bombCount"] = bombCount, ["controlled"] = controlled, ["bombs"] = bombs,
                });
            }
            return list;
        }

        // BallMgr.GetBallType (BallMgr.cs:45-72) — copied switch
        static BombType BallMgrType(int ballId) => ballId switch
        {
            1 or 56 or 99 => BombType.FORZEN,
            3 => BombType.FLY,
            5 or 59 or 64 or 97 or 98 or 120 or 10009 => BombType.CURE,
            110 or 117 => BombType.WORLDCUP,
            128 or 129 => BombType.CATCHINSECT,
            _ => BombType.Normal,
        };

        static object DamageVectors()
        {
            var list = new List<object>();
            var r = new Random(909);
            var map = LoadMap(1001);
            var game = new BaseGame { m_random = new Random(1), Map = map };
            for (int c = 0; c < 40; c++)
            {
                var owner = new Player(1, game, 1)
                {
                    BaseDamage = r.Next(50, 900), Attack = r.Next(0, 2500), Grade = r.Next(1, 61), Lucky = r.Next(0, 2500),
                    CurrentDamagePlus = new[] { 1f, 1.5f, 0.5f, 1.1f, 0.75f }[r.Next(5)], CurrentShootMinus = new[] { 1f, 0.6f, 0.9f, 0.54f, 0.5f }[r.Next(5)],
                    IgnoreArmor = r.Next(6) == 0,
                };
                owner.FightBuffers.WorldBossAddDamage = r.Next(4) == 0 ? r.Next(0, 300) : 0;
                var target = new Player(2, game, 2) { BaseGuard = r.Next(0, 900), Defence = r.Next(0, 2500), AddArmor = r.Next(5) == 0 };
                if (target.AddArmor) target.DeputyWeapon = new ItemInfo { Template = new ItemTemplateInfo { Property7 = r.Next(10, 200) }, StrengthenLevel = r.Next(0, 13) };
                int tx = r.Next(200, 1800), ty = r.Next(200, 1000);
                target.SetXY(tx, ty);
                int ballId = new[] { 0, 4, 16, 6, 9 }[r.Next(5)];
                var bomb = new SimpleBomb(50, BombType.Normal, owner, game, Balls[ballId], null, false, -45);
                int bx = tx + r.Next(-130, 130), by = ty + r.Next(-130, 130);
                bomb.SetXY(bx, by);
                list.Add(new Dictionary<string, object>
                {
                    ["owner"] = new double[] { owner.BaseDamage, owner.Attack, owner.Grade, owner.Lucky, owner.CurrentDamagePlus, owner.CurrentShootMinus, owner.IgnoreArmor ? 1 : 0, owner.FightBuffers.WorldBossAddDamage },
                    ["target"] = new double[] { target.BaseGuard, target.Defence, target.AddArmor ? 1 : 0, target.DeputyWeapon?.Template.Property7 ?? 0, target.DeputyWeapon?.StrengthenLevel ?? 0, tx, ty },
                    ["ballId"] = ballId, ["bomb"] = new[] { bx, by },
                    ["boundDistance"] = target.BoundDistance(new Point(bx, by)),
                    ["damage"] = bomb.MakeDamagePublic(target),
                });
            }
            return list;
        }

        static object CritVectors()
        {
            var list = new List<object>();
            foreach (var (seed, lucky) in new[] { (1, 0.0), (2, 300.0), (3, 1200.0), (4, 2500.0), (5, 800.0) })
            {
                var game = new BaseGame { m_random = new Random(seed) };
                var owner = new Player(1, game, 1) { Lucky = lucky };
                owner.FightBuffers.ConsortionAddCritical = seed == 5 ? 30 : 0;
                var target = new Player(2, game, 2) { ReduceCritFisrtGem = seed == 4 ? 10 : 0, ReduceCritSecondGem = seed == 4 ? 5 : 0 };
                var res = Enumerable.Range(0, 20).Select(i => owner.MakeCriticalDamage(target, 100 + i * 37)).ToArray();
                list.Add(new Dictionary<string, object> { ["seed"] = seed, ["lucky"] = lucky, ["addCrit"] = owner.FightBuffers.ConsortionAddCritical, ["reduce"] = target.ReduceCritFisrtGem + target.ReduceCritSecondGem, ["res"] = res });
            }
            return list;
        }

        static object AimVectors()
        {
            var list = new List<object>();
            var r = new Random(4242);
            foreach (var id in MapIds)
            {
                var map = LoadMap(id);
                for (int i = 0; i < 5; i++)
                {
                    int wind10 = r.Next(-50, 51);
                    map.wind = wind10 / 10f;
                    var game = new BaseGame { m_random = new Random(1), Map = map };
                    var p = new Player(1, game, 1);
                    var pos = Ground(map, r);
                    p.SetXY(pos.X, pos.Y);
                    var tpos = Ground(map, r);
                    p.Direction = tpos.X > pos.X ? 1 : -1;
                    int x = tpos.X, y = tpos.Y, force = 0, angle = 0;
                    float time = new[] { 1.0f, 1.5f, 2.0f, 2.5f, 3.0f, 3.5f }[r.Next(6)];
                    p.GetShootForceAndAngle(ref x, ref y, 0, 1001, 10001, 1, time, ref force, ref angle);
                    list.Add(new Dictionary<string, object> { ["mapId"] = id, ["wind10"] = wind10, ["pos"] = new[] { pos.X, pos.Y, p.Direction }, ["target"] = new[] { tpos.X, tpos.Y }, ["time"] = time, ["out"] = new[] { x, y, force, angle } });
                }
            }
            return list;
        }
    }
}
