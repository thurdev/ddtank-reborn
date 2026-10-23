package flash.automation
{
   [ExcludeClass]
   public class KeyboardAutomationAction extends AutomationAction
   {
      
      public static const KEY_DOWN:String = "keyDown";
      
      public static const KEY_UP:String = "keyUp";
      
      private var _keyCode:uint = 0;
      
      public function KeyboardAutomationAction(type:String, keyCode:uint = 0)
      {
         super();
         super.type = type;
         this._keyCode = keyCode;
      }
      
      public function get keyCode() : uint
      {
         return this._keyCode;
      }
      
      public function set keyCode(value:uint) : void
      {
         this._keyCode = value;
      }
   }
}

