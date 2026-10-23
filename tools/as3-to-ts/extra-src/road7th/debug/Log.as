package road7th.debug
{
   import flash.display.DisplayObjectContainer;
   import flash.filters.DropShadowFilter;
   import flash.text.TextField;
   import flash.text.TextFormat;
   import road7th.core.ddt_internal;
   
   use namespace ddt_internal;
   
   public class Log
   {
      
      private static var _debugField:TextField;
      
      private static var _enabled:Boolean = false;
      
      public function Log()
      {
         super();
      }
      
      ddt_internal static function initialize(mainStage:DisplayObjectContainer) : void
      {
         var format:* = null;
         if(!_enabled)
         {
            _debugField = new TextField();
            _debugField.mouseEnabled = false;
            _debugField.filters = [new DropShadowFilter(3,30,0,1,3,3)];
            _debugField.wordWrap = true;
            _debugField.multiline = true;
            format = new TextFormat(null,12,16777215);
            _debugField.defaultTextFormat = format;
            _debugField.width = mainStage.stage.stageWidth;
            _debugField.height = mainStage.stage.stageHeight;
            mainStage.addChild(_debugField);
            _enabled = true;
         }
      }
      
      public static function toTrace(c:*) : void
      {
         if(_enabled)
         {
            _debugField.appendText(c == null ? "null" : c.toString() + "\n");
            _debugField.scrollV = _debugField.bottomScrollV;
         }
      }
   }
}

