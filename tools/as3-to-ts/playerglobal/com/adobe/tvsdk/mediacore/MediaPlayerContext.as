package com.adobe.tvsdk.mediacore
{
   import com.adobe.tvsdk.mediacore.view.AdContainerView;
   import flash.system.AuthorizedFeatures;
   
   [API("712")]
   public class MediaPlayerContext
   {
      
      private var _authorizedFeatures:AuthorizedFeatures;
      
      private var _adContainer:AdContainerView;
      
      public function MediaPlayerContext(authorizedFeatures:AuthorizedFeatures)
      {
         super();
         if(authorizedFeatures == null)
         {
            throw new ArgumentError("authorizedFeatures parameter must not be null. You will need to" + "create and use an AuthorizedFeatureLoader and retrieve the " + "authorizedFeatures for your current application.");
         }
         this._authorizedFeatures = authorizedFeatures;
      }
      
      public function get authorizedFeatures() : AuthorizedFeatures
      {
         return this._authorizedFeatures;
      }
      
      public function set adContainer(value:AdContainerView) : void
      {
         this._adContainer = value;
      }
      
      public function get adContainer() : AdContainerView
      {
         return this._adContainer;
      }
   }
}

