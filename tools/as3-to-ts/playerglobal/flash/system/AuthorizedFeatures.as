package flash.system
{
   import com.adobe.tvsdk.mediacore.MediaPlayer;
   import flash.display.AVLoader;
   import flash.media.AVStream;
   import flash.media.AVURLLoader;
   import flash.media.AVURLStream;
   import flash.net.URLStream;
   import flash.utils.ByteArray;
   
   [API("682")]
   [native(cls="AuthorizedFeaturesClass",gc="exact",instance="AuthorizedFeaturesObject",methods="auto",construct="native")]
   [ExcludeClass]
   public final class AuthorizedFeatures
   {
      
      public function AuthorizedFeatures()
      {
         super();
      }
      
      public native function createApplicationInstaller(param1:XML, param2:ByteArray) : ApplicationInstaller;
      
      public native function enableDiskCache(param1:URLStream) : Boolean;
      
      internal native function isFeatureEnabled(param1:String, param2:String = null) : Boolean;
      
      internal native function isNegativeToken() : Boolean;
      
      [API("688")]
      public native function enableHLSPlayback(param1:AVStream) : Boolean;
      
      public native function enableAVURLLoader(param1:AVURLLoader) : Boolean;
      
      public native function enableAVURLStream(param1:AVURLStream) : Boolean;
      
      public native function enableAVLoader(param1:AVLoader) : Boolean;
      
      [API("702")]
      public native function enableMediaPlayerHLSPlayback(param1:MediaPlayer) : Boolean;
   }
}

