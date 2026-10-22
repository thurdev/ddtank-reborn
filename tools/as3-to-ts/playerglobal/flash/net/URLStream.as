package flash.net
{
   import flash.events.EventDispatcher;
   import flash.utils.*;
   
   [native(cls="URLStreamClass",instance="URLStreamObject",methods="auto")]
   [Event(name="progress",type="flash.events.ProgressEvent")]
   [Event(name="open",type="flash.events.Event")]
   [Event(name="ioError",type="flash.events.IOErrorEvent")]
   [Event(name="httpResponseStatus",type="flash.events.HTTPStatusEvent")]
   [Event(name="httpStatus",type="flash.events.HTTPStatusEvent")]
   [Event(name="securityError",type="flash.events.SecurityErrorEvent")]
   [Event(name="complete",type="flash.events.Event")]
   public class URLStream extends EventDispatcher implements IDataInput
   {
      
      public function URLStream()
      {
         super();
      }
      
      public native function load(param1:URLRequest) : void;
      
      public native function readBytes(param1:ByteArray, param2:uint = 0, param3:uint = 0) : void;
      
      public native function readBoolean() : Boolean;
      
      public native function readByte() : int;
      
      public native function readUnsignedByte() : uint;
      
      public native function readShort() : int;
      
      public native function readUnsignedShort() : uint;
      
      public native function readUnsignedInt() : uint;
      
      public native function readInt() : int;
      
      public native function readFloat() : Number;
      
      public native function readDouble() : Number;
      
      public native function readMultiByte(param1:uint, param2:String) : String;
      
      public native function readUTF() : String;
      
      public native function readUTFBytes(param1:uint) : String;
      
      public native function get connected() : Boolean;
      
      public native function get bytesAvailable() : uint;
      
      public native function close() : void;
      
      public native function readObject() : *;
      
      public native function get objectEncoding() : uint;
      
      public native function set objectEncoding(param1:uint) : void;
      
      public native function get endian() : String;
      
      public native function set endian(param1:String) : void;
      
      public native function get diskCacheEnabled() : Boolean;
      
      public native function get position() : Number;
      
      public native function set position(param1:Number) : void;
      
      public native function get length() : Number;
      
      public native function stop() : void;
   }
}

