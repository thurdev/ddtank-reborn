package com.adobe.tvsdk.mediacore.utils
{
   import flash.events.*;
   import flash.net.*;
   import flash.system.*;
   import flash.utils.ByteArray;
   
   [API("712")]
   [Event(name="error",type="flash.events.ErrorEvent")]
   [Event(name="cancel",type="flash.events.Event")]
   [Event(name="complete",type="flash.events.Event")]
   public class AuthorizedFeaturesHelper extends EventDispatcher
   {
      
      public static const SWF_CONTAINER:String = "swfContainer";
      
      public static const DAT_CONTAINER:String = "datContainer";
      
      private var _authorizeFeatures:AuthorizedFeatures;
      
      private var _authorizeFeatureLoader:AuthorizedFeaturesLoader;
      
      private var _loader:TokenDataLoader;
      
      public function AuthorizedFeaturesHelper()
      {
         super();
         this._authorizeFeatureLoader = new AuthorizedFeaturesLoader();
         this._authorizeFeatureLoader.addEventListener(Event.COMPLETE,this.onFeaturesComplete);
         this._authorizeFeatureLoader.addEventListener(ErrorEvent.ERROR,this.onFeaturesError);
      }
      
      public function get authorizedFeatures() : AuthorizedFeatures
      {
         return this._authorizeFeatures;
      }
      
      public function loadFrom(url:String, containerType:String = "datContainer") : void
      {
         if(url == null || url == "")
         {
            throw ArgumentError("The url parameter must be not null and not empty.");
         }
         if(containerType != DAT_CONTAINER && containerType != SWF_CONTAINER)
         {
            throw new ArgumentError("The container parameter must be DAT_CONTAINER or SWF_CONTAINER.");
         }
         if(this._loader != null)
         {
            throw new ArgumentError("The loading operation is not complete. You\'ll need to call cancel method to" + " stop it or to wait until it finishes.");
         }
         this.resetState();
         this.loadTokenData(url,null,containerType);
      }
      
      public function loadWithWildcard(url:String, movieUrl:String, containerType:String = "swfContainer") : void
      {
         if(url == null || url == "")
         {
            throw ArgumentError("The url parameter must be not null and not empty.");
         }
         if(containerType != DAT_CONTAINER && containerType != SWF_CONTAINER)
         {
            throw new ArgumentError("The container parameter must be DAT_CONTAINER or SWF_CONTAINER.");
         }
         if(this._loader != null)
         {
            throw new ArgumentError("The loading operation is not complete. You\'ll need to call cancel method to" + " stop it or to wait until it finishes.");
         }
         this.resetState();
         this.loadTokenData(url,movieUrl,containerType);
      }
      
      public function cancel() : void
      {
         if(this._loader != null)
         {
            this._loader.cancel();
         }
      }
      
      public function close() : void
      {
         this.resetState();
      }
      
      private function loadTokenData(url:String, movieUrl:String, containerType:String) : void
      {
         this.setUp(containerType == DAT_CONTAINER ? new DATTokenDataLoader() : new SWFTokenDataLoader(movieUrl));
         this._loader.load(new URLRequest(url));
      }
      
      private function setUp(loader:TokenDataLoader) : void
      {
         if(loader == null)
         {
            return;
         }
         this._loader = loader;
         this._loader.addEventListener(Event.COMPLETE,this.onTokenDataComplete);
         this._loader.addEventListener(Event.CANCEL,this.onTokenDataCancel);
         this._loader.addEventListener(ErrorEvent.ERROR,this.onTokenDataError);
      }
      
      private function tearDown() : void
      {
         if(this._loader == null)
         {
            return;
         }
         this._loader.removeEventListener(Event.COMPLETE,this.onTokenDataComplete);
         this._loader.removeEventListener(Event.CANCEL,this.onTokenDataCancel);
         this._loader.removeEventListener(ErrorEvent.ERROR,this.onTokenDataError);
         this._loader = null;
      }
      
      private function onTokenDataComplete(event:Event) : void
      {
         this.loadFeatureFromData(this._loader.tokenData);
      }
      
      private function onTokenDataCancel(event:Event) : void
      {
         this.resetState();
         dispatchEvent(event);
      }
      
      private function onTokenDataError(event:ErrorEvent) : void
      {
         this.handleError(event.text,event.errorID);
      }
      
      public function loadFeatureFromData(byteArray:ByteArray) : void
      {
         try
         {
            this._authorizeFeatureLoader.loadAuthorizedFeaturesFromData(byteArray);
         }
         catch(error:Error)
         {
            handleError(error.message,error.errorID);
         }
      }
      
      private function onFeaturesComplete(event:Event) : void
      {
         this.resetState();
         this._authorizeFeatures = this._authorizeFeatureLoader.authorizedFeatures;
         dispatchEvent(event);
      }
      
      private function onFeaturesError(event:ErrorEvent) : void
      {
         this.handleError(event.text,event.errorID);
      }
      
      private function handleError(message:String, errorId:int) : void
      {
         this.resetState();
         dispatchEvent(new ErrorEvent(ErrorEvent.ERROR,false,false,message,errorId));
      }
      
      private function resetState() : void
      {
         this._authorizeFeatures = null;
         this.tearDown();
      }
   }
}

