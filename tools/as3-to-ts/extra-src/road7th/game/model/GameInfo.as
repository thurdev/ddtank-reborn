package road7th.game.model
{
   import com.pickgliss.ui.core.Disposeable;
   import flash.events.EventDispatcher;
   import flash.utils.Dictionary;
   import road7th.events.GameEvent;
   
   [Event(name="gameOver",type="road7th.events.GameEvent")]
   [Event(name="currentChanged",type="road7th.events.GameEvent")]
   [Event(name="stateChanged",type="road7th.events.GameEvent")]
   [Event(name="removeLiving",type="road7th.events.GameEvent")]
   [Event(name="addLiving",type="road7th.events.GameEvent")]
   public class GameInfo extends EventDispatcher implements Disposeable
   {
      
      private var _map:MapInfo;
      
      private var _self:LocalPlayer;
      
      private var _livings:Dictionary = new Dictionary();
      
      private var _boxs:Dictionary = new Dictionary();
      
      private var _currentLiving:Living;
      
      private var _state:int = 0;
      
      public function GameInfo(self:LocalPlayer, map:MapInfo)
      {
         super();
         this._self = self;
         this._map = map;
         this._livings[this._self.LivingID] = this._self;
      }
      
      public function get livings() : Dictionary
      {
         return this._livings;
      }
      
      public function get map() : MapInfo
      {
         return this._map;
      }
      
      public function addBox(box:Box) : void
      {
         this._boxs[box.name] = box;
         dispatchEvent(new GameEvent(GameEvent.AddBox,0,0,box));
      }
      
      public function getbox(str:String) : Box
      {
         return this._boxs[str];
      }
      
      public function removeBox(str:String) : void
      {
         delete this._boxs[str];
         dispatchEvent(new GameEvent(GameEvent.RemoveBox,0,0,str));
      }
      
      public function addLiving(living:Living) : void
      {
         this._livings[living.LivingID] = living;
         dispatchEvent(new GameEvent(GameEvent.AddLiving,0,0,living));
      }
      
      public function removeLiving(living:Living) : void
      {
         delete this._livings[living.LivingID];
         dispatchEvent(new GameEvent(GameEvent.RemoveLiving,0,0,living));
      }
      
      public function get selfGamePlayer() : LocalPlayer
      {
         return this._self;
      }
      
      public function dispose() : void
      {
      }
      
      public function get currentLiving() : Living
      {
         return this._currentLiving;
      }
      
      public function set currentLiving(val:Living) : void
      {
         if(this._currentLiving == val)
         {
            return;
         }
         this._currentLiving = val;
         dispatchEvent(new GameEvent(GameEvent.CurrentChanged));
      }
      
      public function get state() : int
      {
         return this._state;
      }
      
      public function set state(val:int) : void
      {
         if(this._state == val)
         {
            return;
         }
         this._state = val;
         dispatchEvent(new GameEvent(GameEvent.StateChanged,0));
      }
      
      public function gameOver() : void
      {
         dispatchEvent(new GameEvent(GameEvent.GameOver,0));
      }
   }
}

