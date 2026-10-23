package flash.system
{
   [native(cls="CapabilitiesClass",gc="exact",methods="auto",construct="none")]
   public final class Capabilities
   {
      
      public function Capabilities()
      {
         super();
      }
      
      public static native function get isEmbeddedInAcrobat() : Boolean;
      
      public static native function get hasEmbeddedVideo() : Boolean;
      
      public static native function get hasAudio() : Boolean;
      
      public static native function get avHardwareDisable() : Boolean;
      
      public static native function get hasAccessibility() : Boolean;
      
      public static native function get hasAudioEncoder() : Boolean;
      
      public static native function get hasMP3() : Boolean;
      
      public static native function get hasPrinting() : Boolean;
      
      public static native function get hasScreenBroadcast() : Boolean;
      
      public static native function get hasScreenPlayback() : Boolean;
      
      public static native function get hasStreamingAudio() : Boolean;
      
      public static native function get hasStreamingVideo() : Boolean;
      
      public static native function get hasVideoEncoder() : Boolean;
      
      public static native function get isDebugger() : Boolean;
      
      public static native function get localFileReadDisable() : Boolean;
      
      public static native function get language() : String;
      
      public static native function get manufacturer() : String;
      
      public static native function get os() : String;
      
      public static native function get cpuArchitecture() : String;
      
      public static native function get playerType() : String;
      
      public static native function get serverString() : String;
      
      public static native function get version() : String;
      
      public static native function get screenColor() : String;
      
      public static native function get pixelAspectRatio() : Number;
      
      public static native function get screenDPI() : Number;
      
      public static native function get screenResolutionX() : Number;
      
      public static native function get screenResolutionY() : Number;
      
      [Version("10.1")]
      public static native function get touchscreenType() : String;
      
      public static native function get hasIME() : Boolean;
      
      public static native function get hasTLS() : Boolean;
      
      [Version("10")]
      public static native function get maxLevelIDC() : String;
      
      [Version("10.0.32")]
      public static native function get supports32BitProcesses() : Boolean;
      
      [Version("10.0.32")]
      public static native function get supports64BitProcesses() : Boolean;
      
      public static native function get _internal() : uint;
      
      [API("674")]
      public static native function hasMultiChannelAudio(param1:String) : Boolean;
      
      [API("734")]
      public static native function get cpuAddressSize() : Number;
   }
}

