package flash.net
{
   import flash.events.*;
   import flash.utils.*;
   
   [native(cls="URLLoaderClass",gc="exact",instance="URLLoaderObject",methods="auto")]
   [Event(name="httpResponseStatus",type="flash.events.HTTPStatusEvent")]
   [Event(name="httpStatus",type="flash.events.HTTPStatusEvent")]
   [Event(name="securityError",type="flash.events.SecurityErrorEvent")]
   [Event(name="ioError",type="flash.events.IOErrorEvent")]
   [Event(name="progress",type="flash.events.ProgressEvent")]
   [Event(name="complete",type="flash.events.Event")]
   [Event(name="open",type="flash.events.Event")]
   public class URLLoader extends EventDispatcher
   {
      
      public var data:*;
      
      public var dataFormat:String = "text";
      
      private var stream:URLStream;
      
      public var bytesLoaded:uint = 0;
      
      public var bytesTotal:uint = 0;
      
      public function URLLoader(request:URLRequest = null)
      {
         super();
         this.stream = new URLStream();
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
      }
      
      public function load(request:URLRequest) : void
      {
         this.stream.load(request);
      }
      
      public function close() : void
      {
         this.stream.close();
      }
      
      private function redirectEvent(event:Event) : void
      {
         dispatchEvent(event);
      }
      
      private function onComplete(event:Event) : void
      {
         var bytes:ByteArray = new ByteArray();
         this.stream.readBytes(bytes);
         switch(this.dataFormat)
         {
            case "binary":
               this.data = bytes;
               break;
            case "variables":
               if(bytes.length > 0)
               {
                  this.data = new URLVariables(bytes.toString());
                  break;
               }
            case "text":
            default:
               this.data = bytes.toString();
         }
         dispatchEvent(event);
      }
      
      private function onProgress(event:ProgressEvent) : void
      {
         this.bytesLoaded = event.bytesLoaded;
         this.bytesTotal = event.bytesTotal;
         dispatchEvent(event);
      }
   }
}

