package road7th.game.view.prompt
{
   import flash.display.DisplayObject;
   import flash.events.Event;
   import flash.events.EventDispatcher;
   import flash.geom.Point;
   
   public class PromptBaseView extends EventDispatcher
   {
      
      private var _point:Point;
      
      private var _completeFun:Function;
      
      private var _id:int;
      
      private var _isAutoDispose:Boolean;
      
      private var _view:DisplayObject;
      
      public function PromptBaseView()
      {
         super();
      }
      
      private function _viewIsOver(e:Event) : void
      {
         if(this._completeFun != null)
         {
            this._completeFun();
         }
         dispatchEvent(new Event(Event.COMPLETE));
      }
      
      public function get point() : Point
      {
         return this._point;
      }
      
      public function set point(value:Point) : void
      {
         if(this._point == value)
         {
            return;
         }
         this._point = value;
      }
      
      public function get completeFun() : Function
      {
         return this._completeFun;
      }
      
      public function set completeFun(value:Function) : void
      {
         if(this._completeFun == value)
         {
            return;
         }
         this._completeFun = value;
      }
      
      public function get id() : int
      {
         return this._id;
      }
      
      public function set id(value:int) : void
      {
         if(this._id == value)
         {
            return;
         }
         this._id = value;
      }
      
      public function get isAutoDispose() : Boolean
      {
         return this._isAutoDispose;
      }
      
      public function set isAutoDispose(value:Boolean) : void
      {
         if(this._isAutoDispose == value)
         {
            return;
         }
         this._isAutoDispose = value;
      }
      
      public function get view() : DisplayObject
      {
         return this._view;
      }
      
      public function set view(value:DisplayObject) : void
      {
         if(this._view == value)
         {
            return;
         }
         this._view = value;
         if(Boolean(this._point))
         {
            this._view.x = this._point.x;
            this._view.y = this._point.y;
         }
         this._view.addEventListener(Event.COMPLETE,this._viewIsOver);
      }
      
      public function dispose() : void
      {
         if(Boolean(this._view) && Boolean(this._view["dispose"]))
         {
            this._view["dispose"]();
         }
         if(Boolean(this._view.parent))
         {
            this._view.parent.removeChild(this._view);
         }
         this._point = null;
         this._view = null;
         this._completeFun = null;
      }
   }
}

