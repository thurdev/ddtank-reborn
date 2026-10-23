package road7th.manager
{
   import flash.display.Stage;
   import flash.events.EventDispatcher;
   import flash.events.IEventDispatcher;
   import flash.events.KeyboardEvent;
   import flash.ui.Keyboard;
   import flash.utils.Dictionary;
   import road7th.events.GameKeyEvent;
   import road7th.game.view.prompt.PromptManager;
   
   public class KeyManager extends EventDispatcher
   {
      
      private static var _instance:KeyManager;
      
      public static const VK_SPACE:uint = Keyboard.SPACE;
      
      public static const VK_LEFT:uint = 37;
      
      public static const VK_RIGHT:uint = 39;
      
      public static const VK_A:uint = 65;
      
      public static const VK_D:uint = 68;
      
      private var _lockKey:Dictionary;
      
      public function KeyManager(target:IEventDispatcher = null)
      {
         super(target);
      }
      
      public static function get Instance() : KeyManager
      {
         var _loc1_:* = _instance || new KeyManager();
         _instance = _instance || new KeyManager();
         return _loc1_;
      }
      
      public function start(stage:Stage) : void
      {
         this._lockKey = new Dictionary();
         stage.addEventListener(KeyboardEvent.KEY_DOWN,this._keyDownFun);
         stage.addEventListener(KeyboardEvent.KEY_UP,this._keyUpFun);
      }
      
      private function _keyDownFun(e:KeyboardEvent) : void
      {
         if(GameManager.Instance.Current == null || GameManager.Instance.Current.currentLiving == null)
         {
            return;
         }
         if(!GameManager.Instance.Current.currentLiving.isSelf && e.keyCode == Keyboard.SPACE)
         {
            PromptManager.Instance.show(PromptManager.Instance.SHOW_INFO_YOUCANNOTDO);
         }
         if(Boolean(this._lockKey["all"]))
         {
            return;
         }
         if(!this._lockKey[String(e.keyCode)])
         {
            dispatchEvent(new GameKeyEvent(GameKeyEvent.KEY_DOWN,e.keyCode));
         }
      }
      
      private function _keyUpFun(e:KeyboardEvent) : void
      {
         if(Boolean(this._lockKey["all"]))
         {
            return;
         }
         if(!this._lockKey[String(e.keyCode)])
         {
            dispatchEvent(new GameKeyEvent(GameKeyEvent.KEY_UP,e.keyCode));
         }
      }
      
      public function lockKeyNum(num:int) : void
      {
         this._lockKey[String(num)] = "lock";
      }
      
      public function lockAllKey() : void
      {
         this._lockKey["all"] = "lock";
      }
      
      public function openKeyNum(num:int) : void
      {
         this._lockKey[String(num)] = null;
      }
      
      public function openAllKey() : void
      {
         this._lockKey = new Dictionary();
      }
      
      public function openUnlockKey() : void
      {
         this._lockKey["all"] = null;
      }
   }
}

