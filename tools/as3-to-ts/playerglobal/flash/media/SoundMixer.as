package flash.media
{
   import flash.utils.ByteArray;
   
   [native(cls="SoundMixerClass",instance="SoundMixerObject",methods="auto")]
   public final class SoundMixer
   {
      
      public function SoundMixer()
      {
         super();
      }
      
      public static native function stopAll() : void;
      
      public static native function computeSpectrum(param1:ByteArray, param2:Boolean = false, param3:int = 0) : void;
      
      public static native function get bufferTime() : int;
      
      public static native function set bufferTime(param1:int) : void;
      
      public static native function get soundTransform() : SoundTransform;
      
      public static native function set soundTransform(param1:SoundTransform) : void;
      
      public static native function areSoundsInaccessible() : Boolean;
      
      [API("675")]
      public static native function get audioPlaybackMode() : String;
      
      [API("675")]
      public static native function set audioPlaybackMode(param1:String) : void;
      
      [API("675")]
      public static native function get useSpeakerphoneForVoice() : Boolean;
      
      [API("675")]
      public static native function set useSpeakerphoneForVoice(param1:Boolean) : void;
   }
}

