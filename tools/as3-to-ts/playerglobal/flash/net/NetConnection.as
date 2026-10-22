package flash.net
{
   import flash.events.EventDispatcher;
   
   [native(cls="NetConnectionClass",instance="NetConnectionObject",methods="auto")]
   [Event(name="netStatus",type="flash.events.NetStatusEvent")]
   [Event(name="securityError",type="flash.events.SecurityErrorEvent")]
   [Event(name="ioError",type="flash.events.IOErrorEvent")]
   [Event(name="asyncError",type="flash.events.AsyncErrorEvent")]
   public class NetConnection extends EventDispatcher
   {
      
      private static const kConnect:uint = 0;
      
      private static const kClose:uint = 1;
      
      private static const kCall:uint = 2;
      
      private static const kAddHeader:uint = 3;
      
      private static const kGetConnectedProxyType:uint = 4;
      
      private static const kGetUsingTLS:uint = 5;
      
      private static const kGetProtocol:uint = 6;
      
      private static const kGetNearID:uint = 7;
      
      private static const kGetFarID:uint = 8;
      
      private static const kGetNearNonce:uint = 9;
      
      private static const kGetFarNonce:uint = 10;
      
      public function NetConnection()
      {
         super();
      }
      
      public static native function get defaultObjectEncoding() : uint;
      
      public static native function set defaultObjectEncoding(param1:uint) : void;
      
      public native function get connected() : Boolean;
      
      public native function get uri() : String;
      
      public function close() : void
      {
         this.invoke(kClose);
      }
      
      [Inspectable(environment="none")]
      public function addHeader(operation:String, mustUnderstand:Boolean = false, param:Object = null) : void
      {
         var args:Array = new Array(operation,mustUnderstand,param);
         this.invokeWithArgsArray(kAddHeader,args);
      }
      
      public function call(command:String, responder:Responder, ... arguments) : void
      {
         arguments.unshift(command,responder);
         this.invokeWithArgsArray(kCall,arguments);
      }
      
      public native function connect(param1:String, ... rest) : void;
      
      public native function get client() : Object;
      
      public native function set client(param1:Object) : void;
      
      public native function get objectEncoding() : uint;
      
      public native function set objectEncoding(param1:uint) : void;
      
      public native function get proxyType() : String;
      
      public native function set proxyType(param1:String) : void;
      
      public native function get connectedProxyType() : String;
      
      public native function get usingTLS() : Boolean;
      
      [Version("10")]
      public native function get protocol() : String;
      
      [Version("10")]
      public native function get maxPeerConnections() : uint;
      
      [Version("10")]
      public native function set maxPeerConnections(param1:uint) : void;
      
      [Version("10")]
      public native function get nearID() : String;
      
      [Version("10")]
      public native function get farID() : String;
      
      [Version("10")]
      public native function get nearNonce() : String;
      
      [Version("10")]
      public native function get farNonce() : String;
      
      [Version("10")]
      public native function get unconnectedPeerStreams() : Array;
      
      private native function invoke(param1:uint, ... rest) : *;
      
      private native function invokeWithArgsArray(param1:uint, param2:Array) : *;
   }
}

