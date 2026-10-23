package flash.events
{
   public class FullScreenEvent extends ActivityEvent
   {
      
      public static const FULL_SCREEN:String = "fullScreen";
      
      public static const FULL_SCREEN_INTERACTIVE_ACCEPTED:String = "fullScreenInteractiveAccepted";
      
      private var m_fullScreen:Boolean;
      
      private var m_interactive:Boolean;
      
      public function FullScreenEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, fullScreen:Boolean = false, interactive:Boolean = false)
      {
         super(type,bubbles,cancelable);
         this.m_fullScreen = fullScreen;
         this.m_interactive = interactive;
      }
      
      override public function clone() : Event
      {
         return new FullScreenEvent(type,bubbles,cancelable,this.fullScreen,this.interactive);
      }
      
      override public function toString() : String
      {
         return formatToString("FullScreenEvent","type","bubbles","cancelable","eventPhase","fullScreen","interactive");
      }
      
      public function get fullScreen() : Boolean
      {
         return this.m_fullScreen;
      }
      
      [API("680")]
      public function get interactive() : Boolean
      {
         return this.m_interactive;
      }
   }
}

