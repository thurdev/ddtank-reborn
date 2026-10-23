package road7th.manager
{
   import com.pickgliss.utils.ObjectUtils;
   import flash.display.BitmapData;
   import flash.events.EventDispatcher;
   import flash.geom.Point;
   import road7th.Trainer;
   import road7th.core.ddt_internal;
   import road7th.data.BallInfoFactory;
   import road7th.events.GameEvent;
   import road7th.game.actions.BoguAI;
   import road7th.game.actions.BombAction;
   import road7th.game.model.BallInfo;
   import road7th.game.model.Bomb;
   import road7th.game.model.Box;
   import road7th.game.model.GameInfo;
   import road7th.game.model.Living;
   import road7th.game.model.LocalPlayer;
   import road7th.game.model.MapInfo;
   import road7th.game.view.blood.BloodNumberCreater;
   import road7th.game.view.countDown.SelfMarkManager;
   
   use namespace ddt_internal;
   
   public class GameManager extends EventDispatcher
   {
      
      private static var _ins:GameManager;
      
      ddt_internal static var PhyCount:int = 0;
      
      public static var MOVE_SPEED:Number = 2;
      
      public static const LivingDefaultSpeed:int = 10;
      
      public static const npcStepY:Number = 1.5;
      
      public static const npcStepX:int = 1;
      
      public static var FALL_SPEED:Number = 12;
      
      private var _current:GameInfo;
      
      private var _numCreater:BloodNumberCreater;
      
      private var _equipPool:Object = new Object();
      
      public function GameManager()
      {
         super();
      }
      
      public static function createBombInfos(living:Living, force:int) : Vector.<Bomb>
      {
         var angle:int = living.angle;
         var bombs:Vector.<Bomb> = new Vector.<Bomb>();
         bombs.push(createBombInfo(living,force));
         return bombs;
      }
      
      private static function createBombInfo(living:Living, force:Number) : Bomb
      {
         var bombInfo:Bomb = new Bomb();
         bombInfo.Id = PhyCount++;
         bombInfo.Template = BallInfoFactory.createBallInfo(living.currentBomb);
         bombInfo.Template.Shake = true;
         bombInfo.attack = 120;
         var pt:Point = calculateVelocity(force,living.angle);
         bombInfo.VX = pt.x;
         bombInfo.VY = pt.y;
         var bombAction:BombAction = new BombAction(100,2,200,200,300,300);
         bombInfo.Actions.push(bombAction);
         return bombInfo;
      }
      
      private static function calculateVelocity(force:Number, angle:int) : Point
      {
         var pt:Point = new Point();
         pt.x = force * Math.cos(Number(angle) / 180 * Math.PI);
         pt.y = force * Math.sin(Number(angle) / 180 * Math.PI);
         return pt;
      }
      
      public static function get Instance() : GameManager
      {
         if(_ins == null)
         {
            _ins = new GameManager();
         }
         return _ins;
      }
      
      public static function creatWeapon() : void
      {
      }
      
      public static function creatBall() : BallInfo
      {
         var ball:BallInfo = new BallInfo();
         ball.ID = 121;
         ball.craterID = 121;
         ball.blastOutID = 121;
         ball.ShootSound = "029";
         ball.BombSound = "089";
         return ball;
      }
      
      public function createGame() : GameInfo
      {
         var map:MapInfo = new MapInfo();
         map.id = 2010;
         map.npcs = ["001"];
         map.music = "1006";
         var self:LocalPlayer = new LocalPlayer(PhyCount++,1,502);
         self.playerInfo = Trainer.self;
         self.name = Trainer.self.nickname;
         self.pos = new Point(820,588);
         self.hat = Trainer.self.sex == "female" ? 13 : int(51);
         self.weaponName = "dart";
         var game:GameInfo = new GameInfo(self,map);
         this._current = game;
         return game;
      }
      
      public function addLiving(str:String, p:Point) : void
      {
         var living:Living = new Living(PhyCount++,2,100,"001");
         living.name = str;
         living.pos = p;
         this._current.addLiving(living);
      }
      
      public function addBox(box:Box) : void
      {
         this._current.addBox(box);
      }
      
      public function get Current() : GameInfo
      {
         return this._current;
      }
      
      public function shoot(living:Living, force:int) : void
      {
         var bombs:* = null;
         if(!living.shooting)
         {
            KeyManager.Instance.lockAllKey();
            SelfMarkManager.instance.dispose();
            bombs = createBombInfos(living,force);
            living.shoot(bombs);
         }
      }
      
      public function bomb(bomb:Bomb) : void
      {
         var living:* = null;
         for each(living in this._current.livings)
         {
            if(living.team == 2 && Math.abs(living.pos.x - bomb.X) < 150)
            {
               dispatchEvent(new GameEvent(GameEvent.HitLiving,0,0,bomb,living));
            }
            else if(Math.abs(living.pos.x - bomb.X) < 100 && living.blood != 1)
            {
               living.blood -= bomb.attack;
               dispatchEvent(new GameEvent(GameEvent.HitSelf,0,0,bomb,living));
            }
         }
      }
      
      public function pick(name:String, living:Living) : void
      {
         var self:* = null;
         this._current.removeBox(name);
         if(living.isSelf)
         {
            self = living as LocalPlayer;
            self.dress(this._equipPool[name],name);
         }
      }
      
      public function nextTurn() : void
      {
         var next:* = null;
         var living:* = null;
         for each(living in this._current.livings)
         {
            if(next == null)
            {
               next = living;
            }
            else if(living.delay < next.delay)
            {
               next = living;
            }
         }
         if(!next.isSelf)
         {
            StepManager.Instance.localLock = true;
            KeyManager.Instance.openUnlockKey();
            KeyManager.Instance.lockKeyNum(KeyManager.VK_SPACE);
            new BoguAI(next,new Point(next.pos.x + 50,next.pos.y));
         }
         else
         {
            next.energy = next.maxEnergy;
            StepManager.Instance.localLock = false;
            KeyManager.Instance.openUnlockKey();
            KeyManager.Instance.openKeyNum(KeyManager.VK_SPACE);
            SelfMarkManager.instance.show();
         }
         this.turnTo(next);
      }
      
      public function turnTo(living:Living) : void
      {
         if(this._current.currentLiving != null)
         {
            this._current.currentLiving.isAttacking = false;
            this._current.currentLiving.delay = 0;
         }
         this._current.currentLiving = living;
         this._current.currentLiving.delay += 10;
         this._current.currentLiving.isAttacking = true;
      }
      
      public function storeEquip(type:String, bitmap:BitmapData) : void
      {
         if(this._equipPool.hasOwnProperty(type))
         {
            ObjectUtils.disposeObject(this._equipPool[type]);
         }
         this._equipPool[type] = bitmap;
      }
      
      public function update() : void
      {
      }
      
      public function prepare() : void
      {
      }
      
      public function get numCreater() : BloodNumberCreater
      {
         var _loc1_:* = this._numCreater || new BloodNumberCreater();
         this._numCreater = this._numCreater || new BloodNumberCreater();
         return _loc1_;
      }
   }
}

