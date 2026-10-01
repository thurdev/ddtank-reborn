// Minimal stand-ins for the parts of Game.Logic that the verbatim files in original/ reference.
// Only data members and trivially-behaving methods live here; every formula under test comes from original/.
using System;
using System.Collections.Generic;
using System.Drawing;
using Game.Logic;
using Game.Logic.Phy.Actions;
using Game.Logic.Phy.Maps;
using Game.Logic.Phy.Object;
using SqlDataProvider.Data;

namespace System.Drawing
{
    // System.Drawing.Common is not part of .NET 10's base framework; Tile.cs only needs these members.
    public class Bitmap
    {
        public int Width, Height;
        public Bitmap(int w, int h) { Width = w; Height = h; }
        public Color GetPixel(int x, int y) => Color.Empty;
        public void SetPixel(int x, int y, Color c) { }
    }
}

namespace SqlDataProvider.Data
{
    public class MapInfo { public int Weight { get; set; } public int DragIndex { get; set; } }
    public class ItemTemplateInfo { public int Property7 { get; set; } }
    public class ItemInfo { public ItemTemplateInfo Template { get; set; } public int StrengthenLevel { get; set; } }
}

namespace Game.Logic.Actions
{
    public class FightAchievementAction
    {
        public FightAchievementAction(Living living, eFightAchievementType type, int num, int delay) { }
    }
}

namespace Game.Logic
{
    public class LivingConfig
    {
        public bool IsHelper, CanTakeDamage = true, HaveShield, CancelGuard;
    }
    public class FightBufferInfo { public int WorldBossAddDamage, ConsortionAddCritical; }
    public class PetEffectInfo { public int CritRate, ReduceCritValue; }

    public partial class BaseGame
    {
        public Random m_random;
        public int m_nextWind;
        public bool FrozenWind;
        public float Wind;
        public int m_timeType;
        public Map Map;
        public int LifeTime;
        public Random Random => m_random;
        public List<Point> TempPoints = new List<Point>();
        public void AddTempPoint(int x, int y) { TempPoints.Add(new Point(x, y)); }
        public void AddAction(object action) { }
    }

    public static class BallMgr
    {
        public static Dictionary<int, BallInfo> Balls = new Dictionary<int, BallInfo>();
        public static BallInfo FindBall(int id) => Balls.TryGetValue(id, out var b) ? b : null;
    }
}

public partial class Living : Physics
{
    public LivingConfig Config = new LivingConfig();
    public int Team;
    public double Agility, Attack, Defence, Lucky, BaseDamage, BaseGuard;
    public float CurrentDamagePlus = 1f, CurrentShootMinus = 1f;
    public bool IgnoreArmor, AddArmor, SyncAtTime;
    public int Grade, ReduceCritFisrtGem, ReduceCritSecondGem, FireX, FireY, AddedValueEffect = 1, Prop1, Prop2;
    public FightBufferInfo FightBuffers = new FightBufferInfo();
    public PetEffectInfo PetEffects = new PetEffectInfo();
    public Dictionary<int, int> lastShots = new Dictionary<int, int>();
    protected int m_direction = 1;
    public int Direction { get => m_direction; set => m_direction = value; }
    protected BaseGame m_game;
    private Rectangle m_demageRect;

    public Living(int id, BaseGame game, int team) : base(id) { m_game = game; Team = team; }
    public void SetRelateDemagemRect(int x, int y, int w, int h) { m_demageRect = new Rectangle(x, y, w, h); }
    public override void CollidedByObject(Physics phy) { if (phy is SimpleBomb) ((SimpleBomb)phy).Bomb(); }
}

namespace Game.Logic.Phy.Object
{
    public partial class TurnedLiving : Living
    {
        public int DefaultDelay;
        public TurnedLiving(int id, BaseGame game, int team) : base(id, game, team) { }
    }
    public class Player : TurnedLiving
    {
        public object PlayerDetail = new object();
        public bool IsActive = true;
        public ItemInfo DeputyWeapon;
        public Player(int id, BaseGame game, int team) : base(id, game, team) { m_rect = new Rectangle(-15, -20, 30, 30); }
    }
    public class PhysicalObj : Physics { public PhysicalObj(int id) : base(id) { } }
    public class SimpleNpc : Living { public SimpleNpc(int id, BaseGame game, int team) : base(id, game, team) { } }
    public class SimpleBoss : TurnedLiving { public SimpleBoss(int id, BaseGame game, int team) : base(id, game, team) { } }

    public partial class SimpleBomb : BombObject
    {
        private bool digMap;
        protected List<BombAction> m_actions;
        private bool m_bombed;
        protected bool m_controled;
        private BaseGame m_game;
        private BallInfo m_info;
        private float m_lifeTime;
        private Living m_owner;
        protected List<BombAction> m_petActions;
        protected int m_petRadius;
        protected double m_power;
        protected int m_radius;
        protected Tile m_shape;
        protected BombType m_type;
        protected int m_angle;
        public List<BombAction> Actions => m_actions;
        public BallInfo BallInfo => m_info;
        public bool DigMap => digMap;
        public float LifeTime => m_lifeTime;
        public Living Owner => m_owner;

        /// Harness: record who would be hit, dig and emit BOMB exactly as the first lines of SimpleBomb.BombImp.
        public List<Living> Victims = new List<Living>();
        public bool DigEnabled = true;
        private void BombImp()
        {
            Victims = m_map.FindHitByHitPiont(GetCollidePoint(), m_radius);
            if (digMap && DigEnabled) m_map.Dig(m_x, m_y, m_shape, null);
            m_actions.Add(new BombAction(m_lifeTime, ActionType.BOMB, m_x, m_y, digMap ? 1 : 0, 0));
            Die();
        }
        public int MakeDamagePublic(Living target) => MakeDamage(target);
    }
}

namespace Game.Logic
{
    public partial class WindMgr { }
}
