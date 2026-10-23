package flash.media
{
   import flash.events.EventDispatcher;
   
   [native(cls="MicrophoneClass",instance="MicrophoneObject",methods="auto",construct="check")]
   public final class Microphone extends EventDispatcher
   {
      
      public function Microphone()
      {
         super();
      }
      
      public static native function getMicrophone(param1:int = -1) : Microphone;
      
      public static native function get names() : Array;
      
      [Version("10.1")]
      public static native function get isSupported() : Boolean;
      
      [API("672")]
      public static native function getEnhancedMicrophone(param1:int = -1) : Microphone;
      
      public native function set gain(param1:Number) : void;
      
      public native function set rate(param1:int) : void;
      
      public native function get rate() : int;
      
      [Version("10")]
      public native function set codec(param1:String) : void;
      
      [Version("10")]
      public native function get codec() : String;
      
      [Version("10")]
      public native function get framesPerPacket() : int;
      
      [Version("10")]
      public native function set framesPerPacket(param1:int) : void;
      
      [Version("10")]
      public native function get encodeQuality() : int;
      
      [Version("10")]
      public native function set encodeQuality(param1:int) : void;
      
      [Version("10.1")]
      public native function get noiseSuppressionLevel() : int;
      
      [Version("10.1")]
      public native function set noiseSuppressionLevel(param1:int) : void;
      
      [Version("10.1")]
      public native function get enableVAD() : Boolean;
      
      [Version("10.1")]
      public native function set enableVAD(param1:Boolean) : void;
      
      public native function setSilenceLevel(param1:Number, param2:int = -1) : void;
      
      public native function setUseEchoSuppression(param1:Boolean) : void;
      
      public native function get activityLevel() : Number;
      
      public native function get gain() : Number;
      
      public native function get index() : int;
      
      public native function get muted() : Boolean;
      
      public native function get name() : String;
      
      public native function get silenceLevel() : Number;
      
      public native function get silenceTimeout() : int;
      
      public native function get useEchoSuppression() : Boolean;
      
      public native function setLoopBack(param1:Boolean = true) : void;
      
      public native function get soundTransform() : SoundTransform;
      
      public native function set soundTransform(param1:SoundTransform) : void;
      
      [API("672")]
      public native function get enhancedOptions() : MicrophoneEnhancedOptions;
      
      [API("672")]
      public native function set enhancedOptions(param1:MicrophoneEnhancedOptions) : void;
   }
}

