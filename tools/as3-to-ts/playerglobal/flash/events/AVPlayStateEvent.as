package flash.events
{
   import flash.media.*;
   
   [API("688")]
   public class AVPlayStateEvent extends Event
   {
      
      public static const AV_PLAY_STATE:String = "avPlayState";
      
      private var m_playState:AVPlayState;
      
      public function AVPlayStateEvent(type:String = "avPlayState", bubbles:Boolean = false, cancelable:Boolean = false, inState:int = 0)
      {
         super(type,bubbles,cancelable);
         this.m_playState = new AVPlayState(inState);
      }
      
      public function get playState() : AVPlayState
      {
         return this.m_playState;
      }
   }
}

