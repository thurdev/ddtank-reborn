package flash.automation
{
   [ExcludeClass]
   public class MouseAutomationAction extends AutomationAction
   {
      
      public static const MOUSE_DOWN:String = "mouseDown";
      
      public static const MOUSE_MOVE:String = "mouseMove";
      
      public static const MOUSE_UP:String = "mouseUp";
      
      public static const MOUSE_WHEEL:String = "mouseWheel";
      
      public static const MIDDLE_MOUSE_DOWN:String = "middleMouseDown";
      
      public static const MIDDLE_MOUSE_UP:String = "middleMouseUp";
      
      public static const RIGHT_MOUSE_DOWN:String = "rightMouseDown";
      
      public static const RIGHT_MOUSE_UP:String = "rightMouseUp";
      
      private var _stageX:Number = 0;
      
      private var _stageY:Number = 0;
      
      private var _delta:int = 0;
      
      public function MouseAutomationAction(type:String, stageX:Number = 0, stageY:Number = 0, delta:int = 0)
      {
         super();
         super.type = type;
         this._stageX = stageX;
         this._stageY = stageY;
         this._delta = delta;
      }
      
      public function get stageX() : Number
      {
         return this._stageX;
      }
      
      public function set stageX(value:Number) : void
      {
         this._stageX = value;
      }
      
      public function get stageY() : Number
      {
         return this._stageY;
      }
      
      public function set stageY(value:Number) : void
      {
         this._stageY = value;
      }
      
      public function get delta() : int
      {
         return this._delta;
      }
      
      public function set delta(value:int) : void
      {
         this._delta = value;
      }
   }
}

