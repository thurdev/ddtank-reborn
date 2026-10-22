package flash.media
{
   [API("688")]
   public class AVTrackInfo
   {
      
      public static const DTI_608_CAPTIONS:String = "DTI608Captions";
      
      public static const DTI_708_CAPTIONS:String = "DTI708Captions";
      
      public static const DTI_WEBVTT_CAPTIONS:String = "DTIWebVTTCaptions";
      
      private var m_description:String;
      
      private var m_language:String;
      
      private var m_defaultTrack:Boolean;
      
      private var m_autoSelect:Boolean;
      
      private var m_forced:Boolean;
      
      private var m_activity:Boolean;
      
      private var m_dataTrackInfoServiceType:String;
      
      private var m_pid:int;
      
      public function AVTrackInfo(init_description:String, init_language:String, init_defaultTrack:Boolean, init_autoSelect:Boolean, init_forced:Boolean, init_activity:Boolean, init_dataTrackInfoServiceType:String, init_pid:int)
      {
         super();
         this.m_description = init_description;
         this.m_language = init_language;
         this.m_defaultTrack = init_defaultTrack;
         this.m_autoSelect = init_autoSelect;
         this.m_forced = init_forced;
         this.m_activity = init_activity;
         this.m_dataTrackInfoServiceType = init_dataTrackInfoServiceType;
         this.m_pid = init_pid;
      }
      
      public function get description() : String
      {
         return this.m_description;
      }
      
      public function get language() : String
      {
         return this.m_language;
      }
      
      public function get defaultTrack() : Boolean
      {
         return this.m_defaultTrack;
      }
      
      public function get autoSelect() : Boolean
      {
         return this.m_autoSelect;
      }
      
      public function get forced() : Boolean
      {
         return this.m_forced;
      }
      
      public function get activity() : Boolean
      {
         return this.m_activity;
      }
      
      public function get dataTrackInfoServiceType() : String
      {
         return this.m_dataTrackInfoServiceType;
      }
      
      public function get pid() : int
      {
         return this.m_pid;
      }
   }
}

