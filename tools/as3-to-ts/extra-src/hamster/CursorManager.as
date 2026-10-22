package hamster
{
   import com.pickgliss.toplevel.StageReferance;
   import com.pickgliss.utils.ObjectUtils;
   import flash.display.DisplayObject;
   import flash.display.Sprite;
   import flash.events.MouseEvent;
   import flash.ui.Mouse;
   
   public class CursorManager
   {
      
      private static var _instance:CursorManager;
      
      private var _currentCursor:DisplayObject;
      
      public function CursorManager()
      {
         super();
      }
      
      public static function get Instance() : CursorManager
      {
         if(_instance == null)
         {
            _instance = new CursorManager();
         }
         return _instance;
      }
      
      public function show(cursor:DisplayObject) : void
      {
         if(cursor == this._currentCursor)
         {
            return;
         }
         if(Boolean(this._currentCursor))
         {
            ObjectUtils.disposeObject(this._currentCursor);
         }
         this._currentCursor = cursor;
         Sprite(this._currentCursor).mouseEnabled = false;
         Sprite(this._currentCursor).mouseChildren = false;
         Mouse.hide();
         StageReferance.stage.addChild(this._currentCursor);
         StageReferance.stage.addEventListener(MouseEvent.MOUSE_MOVE,this.__onMouseMove);
      }
      
      public function hide() : void
      {
         StageReferance.stage.removeEventListener(MouseEvent.MOUSE_MOVE,this.__onMouseMove);
         if(Boolean(this._currentCursor))
         {
            ObjectUtils.disposeObject(this._currentCursor);
         }
         this._currentCursor = null;
         Mouse.show();
      }
      
      private function __onMouseMove(evt:MouseEvent) : void
      {
         this._currentCursor.x = StageReferance.stage.mouseX;
         this._currentCursor.y = StageReferance.stage.mouseY;
      }
   }
}

