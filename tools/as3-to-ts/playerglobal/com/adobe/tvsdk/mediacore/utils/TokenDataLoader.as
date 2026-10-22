package com.adobe.tvsdk.mediacore.utils
{
   import flash.events.*;
   import flash.net.URLRequest;
   import flash.utils.ByteArray;
   
   [API("712")]
   [Event(name="error",type="flash.events.ErrorEvent")]
   [Event(name="cancel",type="flash.events.Event")]
   [Event(name="complete",type="flash.events.Event")]
   public class TokenDataLoader extends EventDispatcher
   {
      
      private var _request:URLRequest;
      
      private var _tokenData:ByteArray;
      
      public function TokenDataLoader()
      {
         super();
      }
      
      final public function get tokenData() : ByteArray
      {
         return this._tokenData;
      }
      
      final public function load(request:URLRequest) : void
      {
         if(this._request != null)
         {
            throw new ArgumentError("The loading operation is not complete. You\'ll need to call cancel method to" + " stop it or to wait until it finishes.");
         }
         this.prepareLoad();
         try
         {
            this._request = request;
            this.beginLoad(request);
         }
         catch(error:Error)
         {
            handleError(error);
         }
      }
      
      final public function cancel() : void
      {
         if(this._request == null)
         {
            return;
         }
         this.cancelLoad();
         this.resetState();
         dispatchEvent(new Event(Event.CANCEL));
      }
      
      protected function prepareLoad() : void
      {
      }
      
      protected function beginLoad(request:URLRequest) : void
      {
      }
      
      protected function cancelLoad() : void
      {
      }
      
      final protected function handleComplete(tokenData:ByteArray) : void
      {
         this._tokenData = tokenData;
         this._request = null;
         dispatchEvent(new Event(Event.COMPLETE));
      }
      
      final protected function handleError(error:Error) : void
      {
         this.resetState();
         dispatchEvent(new ErrorEvent(ErrorEvent.ERROR,false,false,error.message,error.errorID));
      }
      
      private function resetState() : void
      {
         this._tokenData = null;
         this._request = null;
      }
   }
}

