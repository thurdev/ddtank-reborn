package flash.events
{
   import flash.display.InteractiveObject;
   
   [native(cls="SoftKeyboardEventClass",instance="SoftKeyboardEventObject",methods="auto")]
   [API("670")]
   public class SoftKeyboardEvent extends Event
   {
      
      public static const SOFT_KEYBOARD_ACTIVATE:String = "softKeyboardActivate";
      
      public static const SOFT_KEYBOARD_DEACTIVATE:String = "softKeyboardDeactivate";
      
      public static const SOFT_KEYBOARD_ACTIVATING:String = "softKeyboardActivating";
      
      private var m_relatedObject:InteractiveObject;
      
      private var m_triggerType:String;
      
      public function SoftKeyboardEvent(type:String, bubbles:Boolean, cancelable:Boolean, relatedObjectVal:InteractiveObject, triggerTypeVal:String)
      {
         super(type,bubbles,cancelable);
         this.relatedObject = relatedObjectVal;
         this.m_triggerType = triggerTypeVal;
      }
      
      override public function clone() : Event
      {
         return new SoftKeyboardEvent(type,bubbles,cancelable,this.m_relatedObject,this.m_triggerType);
      }
      
      override public function toString() : String
      {
         return formatToString("SoftKeyboardEvent","type","bubbles","cancelable","relatedObject","triggerType");
      }
      
      public function get triggerType() : String
      {
         return this.m_triggerType;
      }
      
      public function get relatedObject() : InteractiveObject
      {
         return this.m_relatedObject;
      }
      
      public function set relatedObject(value:InteractiveObject) : void
      {
         this.m_relatedObject = value;
      }
   }
}

