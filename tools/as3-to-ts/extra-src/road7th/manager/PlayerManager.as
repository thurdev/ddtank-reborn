package road7th.manager
{
   import flash.events.EventDispatcher;
   import flash.events.IEventDispatcher;
   import road7th.game.model.SelfInfo;
   
   public class PlayerManager extends EventDispatcher
   {
      
      private static var _instance:PlayerManager;
      
      private var _self:SelfInfo;
      
      public function PlayerManager(target:IEventDispatcher = null)
      {
         super(target);
         this._self = new SelfInfo();
      }
      
      public static function get Instance() : PlayerManager
      {
         var _loc1_:* = _instance || new PlayerManager();
         _instance = _instance || new PlayerManager();
         return _loc1_;
      }
      
      public function get Self() : SelfInfo
      {
         return this._self;
      }
   }
}

