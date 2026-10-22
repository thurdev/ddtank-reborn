package road7th.events
{
   import flash.events.Event;
   
   public class GameKeyEvent extends Event
   {
      
      public static const KEY_DOWN:String = "key_down";
      
      public static const KEY_UP:String = "key_up";
      
      private var _charCode:uint;
      
      public function GameKeyEvent(type:String, charCode:uint = 0, bubbles:Boolean = false, cancelable:Boolean = false)
      {
         this._charCode = charCode;
         super(type,bubbles,cancelable);
      }
      
      public function get charCode() : uint
      {
         return this._charCode;
      }
   }
}

