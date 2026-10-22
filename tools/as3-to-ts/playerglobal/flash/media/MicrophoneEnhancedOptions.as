package flash.media
{
   [API("672")]
   public final class MicrophoneEnhancedOptions
   {
      
      private var m_mode:String;
      
      private var m_echoPath:int;
      
      private var m_nlp:Boolean;
      
      private var m_isVoiceDetected:int;
      
      public function MicrophoneEnhancedOptions()
      {
         super();
         this.m_mode = MicrophoneEnhancedMode.FULL_DUPLEX;
         this.m_echoPath = 128;
         this.m_nlp = true;
         this.m_isVoiceDetected = -1;
      }
      
      public function get mode() : String
      {
         return this.m_mode;
      }
      
      public function set mode(mode:String) : void
      {
         if(MicrophoneEnhancedMode.FULL_DUPLEX == mode || MicrophoneEnhancedMode.HALF_DUPLEX == mode || MicrophoneEnhancedMode.HEADSET == mode || MicrophoneEnhancedMode.SPEAKER_MUTE == mode || MicrophoneEnhancedMode.OFF == mode)
         {
            this.m_mode = mode;
         }
      }
      
      public function get echoPath() : int
      {
         return this.m_echoPath;
      }
      
      public function set echoPath(echoPath:int) : void
      {
         if(128 == echoPath || 256 == echoPath)
         {
            this.m_echoPath = echoPath;
         }
      }
      
      public function get nonLinearProcessing() : Boolean
      {
         return this.m_nlp;
      }
      
      public function set nonLinearProcessing(enabled:Boolean) : void
      {
         this.m_nlp = enabled;
      }
      
      public function get autoGain() : Boolean
      {
         return false;
      }
      
      public function set autoGain(enabled:Boolean) : void
      {
      }
      
      public function get isVoiceDetected() : int
      {
         return this.m_isVoiceDetected;
      }
      
      public function set isVoiceDetected(voiceDetected:int) : *
      {
         this.m_isVoiceDetected = voiceDetected;
      }
   }
}

