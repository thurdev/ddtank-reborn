package flash.net
{
   import flash.events.*;
   import flash.utils.*;
   
   [native(cls="XMLSocketClass",instance="XMLSocketObject",methods="auto")]
   [Event(name="securityError",type="flash.events.SecurityErrorEvent")]
   [Event(name="ioError",type="flash.events.IOErrorEvent")]
   [Event(name="data",type="flash.events.DataEvent")]
   [Event(name="connect",type="flash.events.Event")]
   [Event(name="close",type="flash.events.Event")]
   public class XMLSocket extends EventDispatcher
   {
      
      private var _internalSocket:Socket;
      
      private var _rcvBuffer:ByteArray;
      
      private var _bytesInPacket:uint;
      
      public function XMLSocket(host:String = null, port:int = 0)
      {
         super();
         this._rcvBuffer = new ByteArray();
         this._bytesInPacket = 0;
         this._internalSocket = new Socket(host,port);
         this._internalSocket.addEventListener(Event.CLOSE,this.reflectEvent);
         this._internalSocket.addEventListener(Event.CONNECT,this.reflectEvent);
         this._internalSocket.addEventListener(IOErrorEvent.IO_ERROR,this.reflectEvent);
         this._internalSocket.addEventListener(SecurityErrorEvent.SECURITY_ERROR,this.reflectEvent);
         this._internalSocket.addEventListener(ProgressEvent.SOCKET_DATA,this.scanAndSendEvent);
      }
      
      private function reflectEvent(e:Event) : void
      {
         dispatchEvent(e);
      }
      
      private function scanAndSendEvent(e:ProgressEvent) : void
      {
         var packetHead:uint = 0;
         var oldPosition:uint = uint(this._rcvBuffer.position);
         var i:uint = 0;
         var numBytes:uint = 0;
         var currentPosition:uint = 0;
         if(Boolean(this._internalSocket.bytesAvailable))
         {
            this._internalSocket.readBytes(this._rcvBuffer,this._rcvBuffer.position);
         }
         this._rcvBuffer.position = oldPosition;
         numBytes = this._rcvBuffer.bytesAvailable + this._bytesInPacket;
         for(i = uint(this._bytesInPacket); i < numBytes; i++)
         {
            ++this._bytesInPacket;
            if(this._rcvBuffer[i] == 0)
            {
               this._rcvBuffer.position = currentPosition;
               dispatchEvent(new DataEvent(DataEvent.DATA,false,false,this._rcvBuffer.readUTFBytes(this._bytesInPacket)));
               currentPosition += this._bytesInPacket;
               this._bytesInPacket = 0;
            }
         }
         if(this._bytesInPacket != 0)
         {
            for(i = 0; i < this._bytesInPacket; i++)
            {
               this._rcvBuffer[i] = this._rcvBuffer[currentPosition++];
            }
            this._rcvBuffer.length = this._bytesInPacket;
            this._rcvBuffer.position = this._bytesInPacket;
         }
         else
         {
            this._rcvBuffer.length = 0;
            this._rcvBuffer.position = 0;
         }
      }
      
      public function connect(host:String, port:int) : void
      {
         this._internalSocket.connect(host,port);
      }
      
      public function send(object:*) : void
      {
         var x:XML = null;
         if(object is XML)
         {
            this._internalSocket.writeUTFBytes(object.toXMLString());
         }
         else
         {
            this._internalSocket.writeUTFBytes(object.toString());
         }
         this._internalSocket.writeByte(0);
         this._internalSocket.flush();
      }
      
      [Version("10")]
      public function get timeout() : int
      {
         return this._internalSocket.timeout;
      }
      
      [Version("10")]
      public function set timeout(value:int) : void
      {
         this._internalSocket.timeout = value;
      }
      
      public function close() : void
      {
         this._internalSocket.close();
      }
      
      public function get connected() : Boolean
      {
         return this._internalSocket.connected;
      }
   }
}

