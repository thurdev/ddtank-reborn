package flash.net
{
   import flash.events.*;
   import flash.utils.*;
   
   [native(cls="SocketClass",instance="SocketObject",methods="auto")]
   [Event(name="securityError",type="flash.events.SecurityErrorEvent")]
   [Event(name="outputProgress",type="flash.events.OutputProgressEvent")]
   [Event(name="socketData",type="flash.events.ProgressEvent")]
   [Event(name="ioError",type="flash.events.IOErrorEvent")]
   [Event(name="connect",type="flash.events.Event")]
   [Event(name="close",type="flash.events.Event")]
   public class Socket extends EventDispatcher implements IDataInput, IDataOutput
   {
      
      private static const MIN_TIMEOUT:* = 250;
      
      private var _timeout:uint;
      
      private var _timeoutTimer:Timer;
      
      private var _timeoutEvent:SecurityErrorEvent;
      
      public function Socket(host:String = null, port:int = 0)
      {
         super();
         this._init();
         if(host != null)
         {
            this.connect(host,port);
         }
      }
      
      private function _init() : void
      {
         if(Boolean(this._timeoutTimer))
         {
            return;
         }
         this._timeout = 20000;
         this._timeoutTimer = new Timer(this._timeout);
         this._timeoutTimer.addEventListener(TimerEvent.TIMER,this.onTimeout);
      }
      
      public function connect(host:String, port:int) : void
      {
         this._init();
         this._timeoutEvent = new SecurityErrorEvent(SecurityErrorEvent.SECURITY_ERROR,false,false,this.internalGetSecurityErrorMessage(host,port));
         this._timeoutTimer.reset();
         this._timeoutTimer.delay = this._timeout;
         this._timeoutTimer.start();
         this.internalConnect(host,port);
      }
      
      private native function internalGetSecurityErrorMessage(param1:String, param2:int) : String;
      
      [Version("10")]
      public function get timeout() : uint
      {
         return this._timeout;
      }
      
      [Version("10")]
      public function set timeout(value:uint) : void
      {
         if(value < MIN_TIMEOUT)
         {
            this._timeout = MIN_TIMEOUT;
         }
         else
         {
            this._timeout = value;
         }
      }
      
      private function onTimeout(event:TimerEvent) : void
      {
         this._timeoutTimer.stop();
         if(this.didFailureOccur())
         {
            dispatchEvent(this._timeoutEvent);
         }
         else if(!this.connected)
         {
            dispatchEvent(this._timeoutEvent);
         }
      }
      
      private native function internalConnect(param1:String, param2:int) : void;
      
      private native function didFailureOccur() : Boolean;
      
      public native function readBytes(param1:ByteArray, param2:uint = 0, param3:uint = 0) : void;
      
      public native function writeBytes(param1:ByteArray, param2:uint = 0, param3:uint = 0) : void;
      
      public native function writeBoolean(param1:Boolean) : void;
      
      public native function writeByte(param1:int) : void;
      
      public native function writeShort(param1:int) : void;
      
      public native function writeInt(param1:int) : void;
      
      public native function writeUnsignedInt(param1:uint) : void;
      
      public native function writeFloat(param1:Number) : void;
      
      public native function writeDouble(param1:Number) : void;
      
      public native function writeMultiByte(param1:String, param2:String) : void;
      
      public native function writeUTF(param1:String) : void;
      
      public native function writeUTFBytes(param1:String) : void;
      
      public native function readBoolean() : Boolean;
      
      public native function readByte() : int;
      
      public native function readUnsignedByte() : uint;
      
      public native function readShort() : int;
      
      public native function readUnsignedShort() : uint;
      
      public native function readInt() : int;
      
      public native function readUnsignedInt() : uint;
      
      public native function readFloat() : Number;
      
      public native function readDouble() : Number;
      
      public native function readMultiByte(param1:uint, param2:String) : String;
      
      public native function readUTF() : String;
      
      public native function readUTFBytes(param1:uint) : String;
      
      public native function get bytesAvailable() : uint;
      
      public native function get connected() : Boolean;
      
      public function close() : void
      {
         this._init();
         this._timeoutTimer.stop();
         this._timeoutTimer.reset();
         this.internalClose();
      }
      
      private native function internalClose() : void;
      
      public native function flush() : void;
      
      public native function writeObject(param1:*) : void;
      
      public native function readObject() : *;
      
      public native function get objectEncoding() : uint;
      
      public native function set objectEncoding(param1:uint) : void;
      
      public native function get endian() : String;
      
      public native function set endian(param1:String) : void;
      
      [API("674")]
      public native function get bytesPending() : uint;
   }
}

