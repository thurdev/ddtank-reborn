package flash.events
{
   import flash.display.InteractiveObject;
   
   [native(cls="MouseEventClass",gc="exact",instance="MouseEventObject",methods="auto")]
   public class MouseEvent extends Event
   {
      
      public static const CLICK:String = "click";
      
      public static const DOUBLE_CLICK:String = "doubleClick";
      
      public static const MOUSE_DOWN:String = "mouseDown";
      
      public static const MOUSE_MOVE:String = "mouseMove";
      
      public static const MOUSE_OUT:String = "mouseOut";
      
      public static const MOUSE_OVER:String = "mouseOver";
      
      public static const MOUSE_UP:String = "mouseUp";
      
      public static const RELEASE_OUTSIDE:String = "releaseOutside";
      
      public static const MOUSE_WHEEL:String = "mouseWheel";
      
      public static const ROLL_OUT:String = "rollOut";
      
      public static const ROLL_OVER:String = "rollOver";
      
      [API("678")]
      public static const MIDDLE_CLICK:String = "middleClick";
      
      [API("678")]
      public static const MIDDLE_MOUSE_DOWN:String = "middleMouseDown";
      
      [API("678")]
      public static const MIDDLE_MOUSE_UP:String = "middleMouseUp";
      
      [API("678")]
      public static const RIGHT_CLICK:String = "rightClick";
      
      [API("678")]
      public static const RIGHT_MOUSE_DOWN:String = "rightMouseDown";
      
      [API("678")]
      public static const RIGHT_MOUSE_UP:String = "rightMouseUp";
      
      [API("678")]
      public static const CONTEXT_MENU:String = "contextMenu";
      
      private var m_relatedObject:InteractiveObject;
      
      private var m_ctrlKey:Boolean;
      
      private var m_altKey:Boolean;
      
      private var m_shiftKey:Boolean;
      
      private var m_buttonDown:Boolean;
      
      private var m_delta:int;
      
      private var m_isRelatedObjectInaccessible:Boolean;
      
      public function MouseEvent(type:String, bubbles:Boolean = true, cancelable:Boolean = false, localX:Number = undefined, localY:Number = undefined, relatedObject:InteractiveObject = null, ctrlKey:Boolean = false, altKey:Boolean = false, shiftKey:Boolean = false, buttonDown:Boolean = false, delta:int = 0)
      {
         super(type,bubbles,cancelable);
         this.localX = localX;
         this.localY = localY;
         this.m_relatedObject = relatedObject;
         this.m_ctrlKey = ctrlKey;
         this.m_altKey = altKey;
         this.m_shiftKey = shiftKey;
         this.m_buttonDown = buttonDown;
         this.m_delta = delta;
      }
      
      override public function clone() : Event
      {
         return new MouseEvent(type,bubbles,cancelable,this.localX,this.localY,this.m_relatedObject,this.m_ctrlKey,this.m_altKey,this.m_shiftKey,this.m_buttonDown,this.m_delta);
      }
      
      override public function toString() : String
      {
         return formatToString("MouseEvent","type","bubbles","cancelable","eventPhase","localX","localY","stageX","stageY","relatedObject","ctrlKey","altKey","shiftKey","buttonDown","delta");
      }
      
      public native function get localX() : Number;
      
      public native function set localX(param1:Number) : void;
      
      public native function get localY() : Number;
      
      public native function set localY(param1:Number) : void;
      
      public function get relatedObject() : InteractiveObject
      {
         return this.m_relatedObject;
      }
      
      public function set relatedObject(value:InteractiveObject) : void
      {
         this.m_relatedObject = value;
      }
      
      public function get ctrlKey() : Boolean
      {
         return this.m_ctrlKey;
      }
      
      public function set ctrlKey(value:Boolean) : void
      {
         this.m_ctrlKey = value;
      }
      
      public function get altKey() : Boolean
      {
         return this.m_altKey;
      }
      
      public function set altKey(value:Boolean) : void
      {
         this.m_altKey = value;
      }
      
      public function get shiftKey() : Boolean
      {
         return this.m_shiftKey;
      }
      
      public function set shiftKey(value:Boolean) : void
      {
         this.m_shiftKey = value;
      }
      
      public function get buttonDown() : Boolean
      {
         return this.m_buttonDown;
      }
      
      public function set buttonDown(value:Boolean) : void
      {
         this.m_buttonDown = value;
      }
      
      public function get delta() : int
      {
         return this.m_delta;
      }
      
      public function set delta(value:int) : void
      {
         this.m_delta = value;
      }
      
      public function get stageX() : Number
      {
         if(Boolean(isNaN(this.localX)) || Boolean(isNaN(this.localY)))
         {
            return Number.NaN;
         }
         return this.getStageX();
      }
      
      public function get stageY() : Number
      {
         if(Boolean(isNaN(this.localX)) || Boolean(isNaN(this.localY)))
         {
            return Number.NaN;
         }
         return this.getStageY();
      }
      
      public native function updateAfterEvent() : void;
      
      private native function getStageX() : Number;
      
      private native function getStageY() : Number;
      
      [Version("10")]
      public function get isRelatedObjectInaccessible() : Boolean
      {
         return this.m_isRelatedObjectInaccessible;
      }
      
      [Version("10")]
      public function set isRelatedObjectInaccessible(value:Boolean) : void
      {
         this.m_isRelatedObjectInaccessible = value;
      }
      
      [API("678")]
      public native function get movementX() : Number;
      
      [API("678")]
      public native function set movementX(param1:Number) : void;
      
      [API("678")]
      public native function get movementY() : Number;
      
      [API("678")]
      public native function set movementY(param1:Number) : void;
   }
}

