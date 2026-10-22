package flash.ui
{
   import flash.events.EventDispatcher;
   
   [native(cls="GameInputControlClass",instance="GameInputControlObject",methods="auto",construct="native")]
   [API("688")]
   [Event(name="change",type="flash.events.Event")]
   public dynamic class GameInputControl extends EventDispatcher
   {
      
      public function GameInputControl()
      {
         super();
      }
      
      public native function get value() : Number;
      
      public native function get minValue() : Number;
      
      public native function get maxValue() : Number;
      
      public native function get device() : GameInputDevice;
      
      public native function get id() : String;
   }
}

