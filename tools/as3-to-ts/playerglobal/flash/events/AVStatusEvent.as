package flash.events
{
   import flash.media.*;
   
   [API("688")]
   public class AVStatusEvent extends Event
   {
      
      public static const AV_STATUS:String = "avStatus";
      
      public static const LOAD_COMPLETE:String = "LoadComplete";
      
      public static const MANIFEST_UPDATE:String = "ManifestUpdate";
      
      public static const INSERTION_COMPLETE:String = "InsertionComplete";
      
      public static const ERROR:String = "Error";
      
      public static const WARNING:String = "Warning";
      
      public static const DIMENSION_CHANGE:String = "DimensionChange";
      
      public static const DECODER_TYPE:String = "DecoderType";
      
      public static const RENDER_TYPE:String = "RenderType";
      
      public static const SEEK_COMPLETE:String = "SeekComplete";
      
      public static const STEP_COMPLETE:String = "StepComplete";
      
      public static const STREAM_SWITCH:String = "StreamSwitch";
      
      public static const PLAY_STATE:String = "PlayState";
      
      public static const BUFFER_STATE:String = "BufferState";
      
      public static const TRICKPLAY_ENDED:String = "TrickPlayEnded";
      
      public static const BACKGROUND_MANIFEST_ERROR:String = "BackgroundManifestError";
      
      public static const BACKGROUND_MANIFEST_WARNING:String = "BackgroundManifestWarning";
      
      private var m_result:AVResult;
      
      private var m_notificationType:String;
      
      private var m_description:String;
      
      public function AVStatusEvent(type:String = "avStatus", bubbles:Boolean = false, cancelable:Boolean = false, inNotificationType:String = "", inResult:int = 0, inDescription:String = "")
      {
         super(type,bubbles,cancelable);
         this.m_notificationType = inNotificationType;
         this.m_result = new AVResult(inResult);
         this.m_description = inDescription;
      }
      
      public function get result() : AVResult
      {
         return this.m_result;
      }
      
      public function get notificationType() : String
      {
         return this.m_notificationType;
      }
      
      public function get description() : String
      {
         return this.m_description;
      }
   }
}

