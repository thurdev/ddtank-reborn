package com.adobe.tvsdk.mediacore.utils
{
   import flash.events.*;
   import flash.net.*;
   import flash.utils.*;
   
   [API("712")]
   public class DATTokenDataLoader extends TokenDataLoader
   {
      
      private var _loader:URLLoader;
      
      public function DATTokenDataLoader()
      {
         super();
      }
      
      override protected function prepareLoad() : void
      {
         this._loader = new URLLoader();
         this._loader.addEventListener(Event.COMPLETE,this.onComplete);
         this._loader.addEventListener(IOErrorEvent.IO_ERROR,this.onError);
         this._loader.addEventListener(SecurityErrorEvent.SECURITY_ERROR,this.onError);
      }
      
      override protected function beginLoad(request:URLRequest) : void
      {
         try
         {
            this._loader.dataFormat = URLLoaderDataFormat.BINARY;
            this._loader.load(request);
         }
         catch(error:Error)
         {
            handleError(error);
         }
      }
      
      override protected function cancelLoad() : void
      {
         if(this._loader != null)
         {
            this._loader.close();
         }
         this.endLoad();
      }
      
      private function endLoad() : void
      {
         if(this._loader != null)
         {
            this._loader.removeEventListener(Event.COMPLETE,this.onComplete);
            this._loader.removeEventListener(IOErrorEvent.IO_ERROR,this.onError);
            this._loader.removeEventListener(SecurityErrorEvent.SECURITY_ERROR,this.onError);
            this._loader = null;
         }
      }
      
      private function onComplete(event:Event) : void
      {
         var byteArray:ByteArray = null;
         if(this._loader.dataFormat == URLLoaderDataFormat.BINARY)
         {
            byteArray = this._loader.data as ByteArray;
         }
         else
         {
            byteArray = new ByteArray();
            byteArray.writeUTFBytes(this._loader.data);
         }
         this.endLoad();
         if(byteArray == null || byteArray.length == 0)
         {
            handleError(new Error("The token data could not be loaded from the specified file."));
         }
         else
         {
            byteArray.position = 0;
            handleComplete(byteArray);
         }
      }
      
      private function onError(event:ErrorEvent) : void
      {
         this.endLoad();
         handleError(new Error(event.text,event.errorID));
      }
   }
}

