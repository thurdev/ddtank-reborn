package road7th.game.model
{
   import flash.display.BitmapData;
   import flash.events.EventDispatcher;
   import flash.geom.Point;
   import road7th.core.ddt_internal;
   import road7th.data.PlayerInfo;
   import road7th.events.LivingEvent;
   import road7th.game.actions.ActionManager;
   import road7th.game.actions.BaseAction;
   
   use namespace ddt_internal;
   
   [Event(name="moveTo",type="road7th.events.LivingEvent")]
   [Event(name="angleChanged",type="road7th.events.LivingEvent")]
   [Event(name="shootPreparedChanged",type="road7th.events.LivingEvent")]
   [Event(name="shootingChanged",type="road7th.events.LivingEvent")]
   [Event(name="shoot",type="road7th.events.LivingEvent")]
   [Event(name="directionChanged",type="road7th.events.LivingEvent")]
   [Event(name="energyChanged",type="road7th.events.LivingEvent")]
   [Event(name="bloodChanged",type="road7th.events.LivingEvent")]
   [Event(name="posChanged",type="road7th.events.LivingEvent")]
   [Event(name="attackChanged",type="road7th.events.LivingEvent")]
   [Event(name="hiddenChanged",type="road7th.events.LivingEvent")]
   public class Living extends EventDispatcher
   {
      
      public static const BORN_ACTION:String = "born";
      
      public static const DIE_ACTION:String = "die";
      
      public static const STAND_ACTION:String = "stand";
      
      ddt_internal var delay:int = -1;
      
      protected var _livingID:int;
      
      private var _movieid:String;
      
      public var playerInfo:PlayerInfo;
      
      public var focus:Boolean = true;
      
      protected var _isLiving:Boolean = true;
      
      protected var _isAttacking:Boolean = false;
      
      protected var _pos:Point = new Point();
      
      protected var _actionManager:ActionManager = new ActionManager();
      
      protected var _maxBlood:int;
      
      private var _team:int;
      
      public var isWin:Boolean = false;
      
      protected var _blood:int = 1000;
      
      protected var _maxEnergy:int = 1000;
      
      protected var _energy:int = this._maxEnergy;
      
      private var _direction:int = 1;
      
      public var name:String;
      
      private var _isHidden:Boolean;
      
      protected var _shooting:Boolean;
      
      private var _isShootPrepared:Boolean;
      
      public var currentBomb:int = 121;
      
      protected var _angle:int = 20;
      
      public var shot:BitmapData;
      
      public function Living(id:int, team:int, maxBlood:int, movieid:String = null)
      {
         this._livingID = id;
         this._team = team;
         this._blood = this._maxBlood = maxBlood;
         this._movieid = movieid;
         super();
      }
      
      public function get LivingID() : int
      {
         return this._livingID;
      }
      
      public function get isLiving() : Boolean
      {
         return this._isLiving;
      }
      
      public function get maxBlood() : int
      {
         return this._maxBlood;
      }
      
      public function get team() : int
      {
         return this._team;
      }
      
      public function get isSelf() : Boolean
      {
         return false;
      }
      
      public function get isAttacking() : Boolean
      {
         return this._isAttacking;
      }
      
      public function set isAttacking(val:Boolean) : void
      {
         if(this._isAttacking != val)
         {
            this._isAttacking = val;
            dispatchEvent(new LivingEvent(LivingEvent.AttackChanged));
         }
      }
      
      public function get pos() : Point
      {
         return this._pos;
      }
      
      public function set pos(val:Point) : void
      {
         if(this._pos.x != val.x || this._pos.y != val.y)
         {
            this._pos = val;
            dispatchEvent(new LivingEvent(LivingEvent.PosChanged));
         }
      }
      
      public function moveTo(type:Number, target:Point, dir:Number, isLiving:Boolean, action:String = "", speed:int = 3, endAction:String = "", endFunc:Function = null) : void
      {
         if(target.x > this._pos.x)
         {
            this.direction = 1;
         }
         else
         {
            this.direction = -1;
         }
         dispatchEvent(new LivingEvent(LivingEvent.MoveTo,0,0,type,target,dir,isLiving,action,speed,endAction,endFunc));
      }
      
      public function get actionMovieName() : String
      {
         return "game.living.Living" + this._movieid;
      }
      
      public function get blood() : int
      {
         return this._blood;
      }
      
      public function set blood(val:int) : void
      {
         if(this._blood == val)
         {
            return;
         }
         this._blood = val;
         if(this._blood < 0)
         {
            this._blood = 1;
         }
         dispatchEvent(new LivingEvent(LivingEvent.BloodChanged));
      }
      
      public function get maxEnergy() : int
      {
         return this._maxEnergy;
      }
      
      public function set maxEnergy(val:int) : void
      {
         if(this._maxEnergy == val)
         {
            return;
         }
         this._maxEnergy = val;
         dispatchEvent(new LivingEvent(LivingEvent.EnergyChanged));
      }
      
      public function get energy() : int
      {
         return this._energy;
      }
      
      public function set energy(val:int) : void
      {
         if(this._energy == val)
         {
            return;
         }
         this._energy = val;
         dispatchEvent(new LivingEvent(LivingEvent.EnergyChanged));
      }
      
      public function get direction() : int
      {
         return this._direction;
      }
      
      public function set direction(val:int) : void
      {
         if(this._direction == val)
         {
            return;
         }
         this._direction = val;
         dispatchEvent(new LivingEvent(LivingEvent.DirectionChanged));
      }
      
      public function act(action:BaseAction) : void
      {
         this._actionManager.act(action);
      }
      
      public function update() : void
      {
         if(this._actionManager != null)
         {
            this._actionManager.execute();
         }
      }
      
      public function get isHidden() : Boolean
      {
         return this._isHidden;
      }
      
      public function set isHidden(value:Boolean) : void
      {
         if(value == this._isHidden)
         {
            return;
         }
         this._isHidden = value;
         dispatchEvent(new LivingEvent(LivingEvent.HiddenChanged));
      }
      
      public function get shooting() : Boolean
      {
         return this._shooting;
      }
      
      public function set shooting(val:Boolean) : void
      {
         if(this._shooting == val)
         {
            return;
         }
         this._shooting = val;
         dispatchEvent(new LivingEvent(LivingEvent.ShootingChanged));
      }
      
      public function get isShootPrepared() : Boolean
      {
         return this._isShootPrepared;
      }
      
      public function set isShootPrepared(val:Boolean) : void
      {
         if(this._isShootPrepared == val)
         {
            return;
         }
         this._isShootPrepared = val;
         dispatchEvent(new LivingEvent(LivingEvent.ShootPreparedChanged));
      }
      
      public function shoot(list:Vector.<Bomb>) : void
      {
         dispatchEvent(new LivingEvent(LivingEvent.Shoot,0,0,list));
      }
      
      public function die() : void
      {
      }
      
      public function playMovie(type:String, fun:Function = null, args:Array = null) : void
      {
         dispatchEvent(new LivingEvent(LivingEvent.PLAY_MOVIE,0,0,type,fun,args));
      }
      
      public function get angle() : int
      {
         return this._direction > 0 ? int(-this._angle) : int(this._angle - 180);
      }
      
      public function set angle(val:int) : void
      {
         if(this._angle == val)
         {
            return;
         }
         this._angle = val;
         dispatchEvent(new LivingEvent(LivingEvent.AngleChanged));
      }
      
      public function doDefaultAction() : void
      {
         this.playMovie(STAND_ACTION);
      }
   }
}

