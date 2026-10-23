package road7th.game.model
{
   import flash.display.BitmapData;
   import flash.geom.Point;
   import road7th.events.LivingEvent;
   import road7th.manager.StepManager;
   
   [Event(name="dress",type="road7th.events.LivingEvent")]
   [Event(name="sendShootAction",type="road7th.events.LivingEvent")]
   [Event(name="beginShoot",type="road7th.events.LivingEvent")]
   public class LocalPlayer extends Living
   {
      
      public var weaponName:String;
      
      public var hat:int;
      
      private var _powerRatio:int = 100;
      
      public var shootCount:int;
      
      private var _shootOverCount:int;
      
      private var _currentWeapInfo:WeaponInfo;
      
      public function LocalPlayer(id:int, team:int, maxBlood:int)
      {
         super(id,team,maxBlood);
      }
      
      public function get powerRatio() : Number
      {
         return this._powerRatio / 100;
      }
      
      public function set powerRatio(value:Number) : void
      {
         this._powerRatio = value;
      }
      
      override public function get isSelf() : Boolean
      {
         return true;
      }
      
      public function get skill() : int
      {
         return 0;
      }
      
      override public function set pos(val:Point) : void
      {
         if((_pos.x != val.x || _pos.y != val.y) && energy != 0)
         {
            _pos = val;
            if(StepManager.Instance.nowStep == StepManager.Instance.STEPI || StepManager.Instance.nowStep == StepManager.Instance.STEPII)
            {
               energy -= 1;
            }
            else
            {
               energy -= 10;
            }
            dispatchEvent(new LivingEvent(LivingEvent.PosChanged));
         }
      }
      
      public function get isSpecialSkill() : Boolean
      {
         return false;
      }
      
      public function get shootOverCount() : int
      {
         return this._shootOverCount;
      }
      
      public function set shootOverCount(val:int) : void
      {
         this._shootOverCount = val;
      }
      
      public function beginShoot() : void
      {
         dispatchEvent(new LivingEvent(LivingEvent.BeginShoot));
      }
      
      public function sendShootAction(force:Number) : void
      {
         dispatchEvent(new LivingEvent(LivingEvent.SendShootAction,0,0,force));
      }
      
      public function get currentWeapInfo() : WeaponInfo
      {
         if(!this._currentWeapInfo)
         {
            this._currentWeapInfo = new WeaponInfo();
         }
         return this._currentWeapInfo;
      }
      
      public function dress(bitmap:BitmapData, layer:String) : void
      {
         dispatchEvent(new LivingEvent(LivingEvent.Dress,0,0,bitmap,layer));
      }
   }
}

