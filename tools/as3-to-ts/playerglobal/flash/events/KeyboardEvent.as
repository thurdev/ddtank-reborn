package flash.events
{
   [native(cls="KeyboardEventClass",gc="exact",instance="KeyboardEventObject",methods="auto")]
   public class KeyboardEvent extends Event
   {
      
      public static const KEY_DOWN:String = "keyDown";
      
      public static const KEY_UP:String = "keyUp";
      
      private var m_keyLocation:uint;
      
      private var m_keyCode:uint;
      
      public function KeyboardEvent(type:String, bubbles:Boolean = true, cancelable:Boolean = false, charCodeValue:uint = 0, keyCodeValue:uint = 0, keyLocationValue:uint = 0, ctrlKeyValue:Boolean = false, altKeyValue:Boolean = false, shiftKeyValue:Boolean = false)
      {
         super(type,bubbles,cancelable);
         this.charCode = charCodeValue;
         this.keyCode = keyCodeValue;
         this.keyLocation = keyLocationValue;
         this.ctrlKey = ctrlKeyValue;
         this.altKey = altKeyValue;
         this.shiftKey = shiftKeyValue;
      }
      
      override public function clone() : Event
      {
         return new KeyboardEvent(type,bubbles,cancelable,this.charCode,this.keyCode,this.keyLocation,this.ctrlKey,this.altKey,this.shiftKey);
      }
      
      override public function toString() : String
      {
         return formatToString("KeyboardEvent","type","bubbles","cancelable","eventPhase","charCode","keyCode","keyLocation","ctrlKey","altKey","shiftKey");
      }
      
      public native function get charCode() : uint;
      
      public native function set charCode(param1:uint) : void;
      
      public function get keyCode() : uint
      {
         return this.m_keyCode;
      }
      
      public function set keyCode(value:uint) : void
      {
         this.m_keyCode = value;
      }
      
      public function get keyLocation() : uint
      {
         return this.m_keyLocation;
      }
      
      public function set keyLocation(value:uint) : void
      {
         this.m_keyLocation = value;
      }
      
      public native function get ctrlKey() : Boolean;
      
      public native function set ctrlKey(param1:Boolean) : void;
      
      public native function get altKey() : Boolean;
      
      public native function set altKey(param1:Boolean) : void;
      
      public native function get shiftKey() : Boolean;
      
      public native function set shiftKey(param1:Boolean) : void;
      
      public native function updateAfterEvent() : void;
   }
}

