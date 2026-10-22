package flash.system
{
   import flash.events.EventDispatcher;
   import flash.utils.ByteArray;
   
   [API("682")]
   [native(cls="AuthorizedFeaturesLoaderClass",gc="exact",instance="AuthorizedFeaturesLoaderObject",methods="auto")]
   [ExcludeClass]
   public final class AuthorizedFeaturesLoader extends EventDispatcher
   {
      
      public function AuthorizedFeaturesLoader()
      {
         super();
      }
      
      public native function get authorizedFeatures() : AuthorizedFeatures;
      
      public native function loadAuthorizedFeatures() : void;
      
      [API("688")]
      public native function loadAuthorizedFeaturesFromData(param1:ByteArray) : void;
      
      [API("682")]
      internal native function makeGlobal() : void;
   }
}

