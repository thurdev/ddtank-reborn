package flash.events
{
   import flash.display.InteractiveObject;
   
   public class FocusEvent extends Event
   {
      
      public static const FOCUS_IN:String = "focusIn";
      
      public static const FOCUS_OUT:String = "focusOut";
      
      public static const KEY_FOCUS_CHANGE:String = "keyFocusChange";
      
      public static const MOUSE_FOCUS_CHANGE:String = "mouseFocusChange";
      
      private var m_relatedObject:InteractiveObject;
      
      private var m_shiftKey:Boolean;
      
      private var m_keyCode:uint;
      
      private var m_isRelatedObjectInaccessible:Boolean;
      
      public function FocusEvent(type:String, bubbles:Boolean = true, cancelable:Boolean = false, relatedObject:InteractiveObject = null, shiftKey:Boolean = false, keyCode:uint = 0)
      {
         super(type,bubbles,cancelable);
         this.m_relatedObject = relatedObject;
         this.m_shiftKey = shiftKey;
         this.m_keyCode = keyCode;
      }
      
      override public function clone() : Event
      {
         return new FocusEvent(type,bubbles,cancelable,this.m_relatedObject,this.m_shiftKey,this.m_keyCode);
      }
      
      public function get relatedObject() : InteractiveObject
      {
         return this.m_relatedObject;
      }
      
      public function set relatedObject(value:InteractiveObject) : void
      {
         this.m_relatedObject = value;
      }
      
      public function get shiftKey() : Boolean
      {
         return this.m_shiftKey;
      }
      
      public function set shiftKey(value:Boolean) : void
      {
         this.m_shiftKey = value;
      }
      
      public function get keyCode() : uint
      {
         return this.m_keyCode;
      }
      
      public function set keyCode(value:uint) : void
      {
         this.m_keyCode = value;
      }
      
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
      
      override public function toString() : String
      {
         return formatToString("FocusEvent","type","bubbles","cancelable","eventPhase","relatedObject","shiftKey","keyCode");
      }
   }
}

