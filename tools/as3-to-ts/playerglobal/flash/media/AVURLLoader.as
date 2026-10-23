package flash.media
{
   import flash.events.*;
   import flash.net.*;
   import flash.utils.*;
   
   [native(cls="AVURLLoaderClass",instance="AVURLLoaderObject",methods="auto")]
   [Event(name="httpResponseStatus",type="flash.events.HTTPStatusEvent")]
   [Event(name="httpStatus",type="flash.events.HTTPStatusEvent")]
   [Event(name="securityError",type="flash.events.SecurityErrorEvent")]
   [Event(name="ioError",type="flash.events.IOErrorEvent")]
   [Event(name="progress",type="flash.events.ProgressEvent")]
   [Event(name="complete",type="flash.events.Event")]
   [Event(name="open",type="flash.events.Event")]
   public class AVURLLoader extends URLLoader
   {
      
      public var stream:AVURLStream;
      
      public function AVURLLoader(request:URLRequest = null)
      {
         super();
         this.stream = new AVURLStream();
         this.stream.addEventListener(Event.OPEN,this.redirectEvent);
         this.stream.addEventListener(IOErrorEvent.IO_ERROR,this.onComplete);
         this.stream.addEventListener(SecurityErrorEvent.SECURITY_ERROR,this.redirectEvent);
         this.stream.addEventListener(HTTPStatusEvent.HTTP_STATUS,this.redirectEvent);
         this.stream.addEventListener(ProgressEvent.PROGRESS,this.onProgress);
         this.stream.addEventListener(Event.COMPLETE,this.onComplete);
         if(request != null)
         {
            this.load(request);
         }
      }
      
      override public function addEventListener(type:String, listener:Function, useCapture:Boolean = false, priority:int = 0, useWeakReference:Boolean = false) : void
      {
         super.addEventListener(type,listener,useCapture,priority,useWeakReference);
         if(type == HTTPStatusEvent.HTTP_RESPONSE_STATUS)
         {
            this.stream.addEventListener(HTTPStatusEvent.HTTP_RESPONSE_STATUS,this.redirectEvent);
         }
         else if(type == AVHTTPStatusEvent.AV_HTTP_RESPONSE_STATUS)
         {
            this.stream.addEventListener(AVHTTPStatusEvent.AV_HTTP_RESPONSE_STATUS,this.redirectEvent);
         }
      }
      
      override public function load(request:URLRequest) : void
      {
         this.stream.load(request);
      }
      
      override public function close() : void
      {
         this.stream.close();
      }
      
      public function set cookieHeader(val:String) : void
      {
         this.stream.cookieHeader = val;
      }
      
      private function redirectEvent(event:Event) : void
      {
         dispatchEvent(event);
      }
      
      private function onComplete(event:Event) : void
      {
         var bytes:ByteArray = new ByteArray();
         this.stream.readBytes(bytes);
         switch(dataFormat)
         {
            case "binary":
               data = bytes;
               break;
            case "variables":
               if(bytes.length > 0)
               {
                  data = new URLVariables(bytes.toString());
                  break;
               }
            case "text":
            default:
               data = bytes.toString();
         }
         dispatchEvent(event);
      }
      
      private function onProgress(event:ProgressEvent) : void
      {
         bytesLoaded = event.bytesLoaded;
         bytesTotal = event.bytesTotal;
         dispatchEvent(event);
      }
   }
}

