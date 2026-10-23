package flash.net.drm
{
   import flash.events.*;
   import flash.net.*;
   import flash.utils.*;
   
   [native(cls="DRMURLDownloadContextClass",instance="DRMURLDownloadContextObject",methods="auto",construct="native")]
   internal class DRMURLDownloadContext extends EventDispatcher
   {
      
      private var httpStatus:uint;
      
      private var urlLoader:URLLoader;
      
      private var networkTimeOutTimer:Timer;
      
      private var isDownloading:Boolean;
      
      public function DRMURLDownloadContext()
      {
         super();
         this.httpStatus = 0;
         this.isDownloading = false;
      }
      
      [cppcall]
      [API("736")]
      public function httpPostAndReceiveASync(url:String, headerName:String, headerValue:String, data:ByteArray, serverType:uint) : void
      {
         var event:DRMLicenseRequestEvent = null;
         var rhArray:Array = null;
         if(serverType == 0)
         {
            event = new DRMLicenseRequestEvent(DRMLicenseRequestEvent.LICENSE_REQUEST);
            event.serverURL = url;
            DRMManager.getDRMManager().dispatchEvent(event);
            url = event.serverURL;
         }
         var urlRequest:URLRequest = new URLRequest(url);
         urlRequest.method = URLRequestMethod.POST;
         urlRequest.data = data;
         if(headerName != null && headerValue != null)
         {
            rhArray = new Array(new URLRequestHeader(headerName,headerValue));
            urlRequest.requestHeaders = rhArray;
         }
         this.doURLDownload(urlRequest);
      }
      
      [cppcall]
      [API("736")]
      public function httpGetASync(url:String) : void
      {
         var urlRequest:URLRequest = new URLRequest(url);
         this.doURLDownload(urlRequest);
      }
      
      private function doURLDownload(urlRequest:URLRequest) : void
      {
         this.urlLoader = new URLLoader();
         this.urlLoader.dataFormat = URLLoaderDataFormat.BINARY;
         this.urlLoader.addEventListener(Event.COMPLETE,this.onAsyncDownloadComplete);
         this.urlLoader.addEventListener(IOErrorEvent.IO_ERROR,this.onAsyncIOError);
         this.urlLoader.addEventListener(SecurityErrorEvent.SECURITY_ERROR,this.onAsyncSecurityError);
         this.urlLoader.addEventListener(HTTPStatusEvent.HTTP_STATUS,this.onHTTPStatus);
         this.urlLoader.addEventListener(ProgressEvent.PROGRESS,this.onProgress);
         this.urlLoader.load(urlRequest);
         this.networkTimeOutTimer = new Timer(DRMManager.networkIdleTimeout);
         this.networkTimeOutTimer.addEventListener(TimerEvent.TIMER,this.onTimer);
         this.networkTimeOutTimer.start();
         this.isDownloading = true;
      }
      
      private function onTimer(ev:TimerEvent) : *
      {
         if(this.isDownloading)
         {
            this.iOnTimeoutError(0);
         }
         this.cleanUp();
      }
      
      private function onProgress(event:ProgressEvent) : void
      {
         this.networkTimeOutTimer.reset();
         this.networkTimeOutTimer.start();
      }
      
      private function onAsyncDownloadComplete(event:Event) : void
      {
         var results:ByteArray = this.urlLoader.data as ByteArray;
         this.iOnDownloadComplete(results);
         this.cleanUp();
      }
      
      private function onAsyncIOError(event:Event) : void
      {
         var ioErrorEvent:IOErrorEvent = event as IOErrorEvent;
         this.iOnIOError(this.httpStatus,ioErrorEvent.text);
         this.cleanUp();
      }
      
      private function onAsyncSecurityError(event:Event) : void
      {
         var secErrorEvent:SecurityErrorEvent = event as SecurityErrorEvent;
         this.iOnSecurityError(secErrorEvent.text);
         this.cleanUp();
      }
      
      private function onHTTPStatus(event:Event) : void
      {
         var httpStatusEvent:HTTPStatusEvent = event as HTTPStatusEvent;
         this.httpStatus = httpStatusEvent.status;
      }
      
      private function cleanUp() : void
      {
         if(Boolean(this.urlLoader))
         {
            this.urlLoader.removeEventListener(Event.COMPLETE,this.onAsyncDownloadComplete);
            this.urlLoader.removeEventListener(IOErrorEvent.IO_ERROR,this.onAsyncIOError);
            this.urlLoader.removeEventListener(SecurityErrorEvent.SECURITY_ERROR,this.onAsyncSecurityError);
            this.urlLoader.removeEventListener(HTTPStatusEvent.HTTP_STATUS,this.onHTTPStatus);
         }
         if(Boolean(this.networkTimeOutTimer))
         {
            this.networkTimeOutTimer.stop();
         }
         this.isDownloading = false;
      }
      
      private native function iOnDownloadComplete(param1:ByteArray) : void;
      
      private native function iOnTimeoutError(param1:uint) : void;
      
      private native function iOnIOError(param1:uint, param2:String) : void;
      
      private native function iOnSecurityError(param1:String) : void;
   }
}

