package flash.net
{
   import flash.events.*;
   import flash.media.*;
   import flash.utils.ByteArray;
   
   [native(cls="NetStreamClass",instance="NetStreamObject",methods="auto")]
   [Event(name="mediaTypeData",type="flash.events.NetDataEvent")]
   [Event(name="onSeekPoint")]
   [Event(name="drmStatus",type="flash.events.DRMStatusEvent")]
   [Event(name="drmError",type="flash.events.DRMErrorEvent")]
   [Event(name="drmAuthenticate",type="flash.events.DRMAuthenticateEvent")]
   [Event(name="onDRMContentData")]
   [Event(name="onPlayStatus")]
   [Event(name="onCuePoint")]
   [Event(name="onTextData")]
   [Event(name="onImageData")]
   [Event(name="onMetaData")]
   [Event(name="onXMPData")]
   [Event(name="netStatus",type="flash.events.NetStatusEvent")]
   [Event(name="ioError",type="flash.events.IOErrorEvent")]
   [Event(name="asyncError",type="flash.events.AsyncErrorEvent")]
   [Event(name="status",type="flash.events.StatusEvent")]
   public class NetStream extends EventDispatcher
   {
      
      private static const kClose:uint = 0;
      
      private static const kAttachAudio:uint = 1;
      
      private static const kAttachVideo:uint = 2;
      
      private static const kSend:uint = 3;
      
      private static const kSetBufferTime:uint = 4;
      
      private static const kCall:uint = 202;
      
      private static const kGetTime:uint = 300;
      
      private static const kGetCurrentFps:uint = 301;
      
      private static const kGetBufferTime:uint = 302;
      
      private static const kGetBufferLength:uint = 303;
      
      private static const kGetLiveDelay:uint = 304;
      
      private static const kGetBytesLoaded:uint = 305;
      
      private static const kGetBytesTotal:uint = 306;
      
      private static const kGetTotalFrames:uint = 307;
      
      private static const kSetTotalFrames:uint = 308;
      
      private static const kGetVideoCodecID:uint = 311;
      
      private static const kSetVideoCodecID:uint = 312;
      
      private static const kGetAudioCodecID:uint = 313;
      
      private static const kSetAudioCodecID:uint = 314;
      
      private static const kGetFarID:uint = 340;
      
      private static const kGetNearNonce:uint = 341;
      
      private static const kGetFarNonce:uint = 342;
      
      private static const kGetInfo:uint = 343;
      
      private static const kGetMulticastInfo:uint = 344;
      
      private static const kAttach:uint = 345;
      
      private static const kGetMaxPauseBufferTime:uint = 400;
      
      private static const kSetMaxPauseBufferTime:uint = 401;
      
      private static const kGetBufferTimeMax:uint = 410;
      
      private static const kSetBufferTimeMax:uint = 411;
      
      private static const kGetBackBufferTime:uint = 450;
      
      private static const kSetBackBufferTime:uint = 451;
      
      private static const kGetBackBufferLength:uint = 452;
      
      private static const kStep:uint = 453;
      
      private static const kGetInBufferSeek:uint = 454;
      
      private static const kSetInBufferSeek:uint = 455;
      
      public static const DIRECT_CONNECTIONS:String = "directConnections";
      
      public static const CONNECT_TO_FMS:String = "connectToFMS";
      
      public function NetStream(connection:NetConnection, peerID:String = "connectToFMS")
      {
         super();
         this.ctor(connection,peerID);
         if(peerID == CONNECT_TO_FMS)
         {
            connection.call("createStream",new Responder(this.onResult,this.onStatus));
         }
      }
      
      [cppcall]
      private static function createOnPlayStatusCompleteObject() : Object
      {
         var obj:Object = new Object();
         obj["level"] = "status";
         obj["code"] = "NetStream.Play.Complete";
         return obj;
      }
      
      [API("690")]
      public static native function resetDRMVouchers() : void;
      
      private native function ctor(param1:NetConnection, param2:String) : void;
      
      private native function onResult(param1:int) : void;
      
      private function onStatus(info:*) : void
      {
         dispatchEvent(new NetStatusEvent("status",false,false,info));
      }
      
      [API("674")]
      public native function dispose() : void;
      
      [Version("10.1")]
      public function attach(connection:NetConnection) : void
      {
         this.invoke(kAttach,this,connection);
         connection.call("createStream",new Responder(this.onResult,this.onStatus));
      }
      
      public function close() : void
      {
         this.invoke(kClose);
      }
      
      public function attachAudio(microphone:Microphone) : void
      {
         this.invoke(kAttachAudio,microphone);
      }
      
      public function attachCamera(theCamera:Camera, snapshotMilliseconds:int = -1) : void
      {
         this.invoke(kAttachVideo,theCamera,snapshotMilliseconds);
      }
      
      public function send(handlerName:String, ... arguments) : void
      {
         arguments.unshift(handlerName);
         this.invokeWithArgsArray(kSend,arguments);
      }
      
      public function get bufferTime() : Number
      {
         return this.invoke(kGetBufferTime);
      }
      
      public function set bufferTime(bufferTime:Number) : void
      {
         this.invoke(kSetBufferTime,bufferTime);
      }
      
      [Version("10")]
      public function get maxPauseBufferTime() : Number
      {
         return this.invoke(kGetMaxPauseBufferTime);
      }
      
      [Version("10")]
      public function set maxPauseBufferTime(pauseBufferTime:Number) : void
      {
         this.invoke(kSetMaxPauseBufferTime,pauseBufferTime);
      }
      
      [Version("10.1")]
      public function get backBufferTime() : Number
      {
         return this.invoke(kGetBackBufferTime);
      }
      
      [Version("10.1")]
      public function set backBufferTime(backBufferTime:Number) : void
      {
         this.invoke(kSetBackBufferTime,backBufferTime);
      }
      
      [Version("10.1")]
      public function get inBufferSeek() : Boolean
      {
         return this.invoke(kGetInBufferSeek);
      }
      
      [Version("10.1")]
      public function set inBufferSeek(value:Boolean) : void
      {
         this.invoke(kSetInBufferSeek,value);
      }
      
      [Version("10.1")]
      public function get backBufferLength() : Number
      {
         return this.invoke(kGetBackBufferLength);
      }
      
      [Version("10.1")]
      public function step(frames:int) : void
      {
         this.invoke(kStep,this,"step",null,frames);
      }
      
      private function call(stream:NetStream, command:String, responder:Responder, ... arguments) : void
      {
         arguments.unshift(stream,command,responder);
         this.invokeWithArgsArray(kCall,arguments);
      }
      
      [Version("10.1")]
      public function get bufferTimeMax() : Number
      {
         return this.invoke(kGetBufferTimeMax);
      }
      
      [Version("10.1")]
      public function set bufferTimeMax(bufferTimeMax:Number) : void
      {
         this.invoke(kSetBufferTimeMax,bufferTimeMax);
      }
      
      public function receiveAudio(flag:Boolean) : void
      {
         this.call(this,"receiveAudio",null,flag);
      }
      
      public function receiveVideo(flag:Boolean) : void
      {
         this.call(this,"receiveVideo",null,flag);
      }
      
      public function receiveVideoFPS(FPS:Number) : void
      {
         this.call(this,"receiveVideo",null,FPS);
      }
      
      public function pause() : void
      {
         this.call(this,"pause",null,true,this.time * 1000);
      }
      
      public function resume() : void
      {
         this.call(this,"pause",null,false,this.time * 1000);
      }
      
      public function togglePause() : void
      {
         this.call(this,"pause",null,undefined,this.time * 1000);
      }
      
      [cppcall]
      public function seek(offset:Number) : void
      {
         this.call(this,"seek",null,offset * 1000);
      }
      
      public native function play(... rest) : void;
      
      [Version("10")]
      public native function play2(param1:NetStreamPlayOptions) : void;
      
      [Version("10")]
      public native function get info() : NetStreamInfo;
      
      [Version("10.1")]
      public native function get multicastInfo() : NetStreamMulticastInfo;
      
      public function publish(name:String = null, type:String = null) : void
      {
         if(Boolean(type))
         {
            this.call(this,"publish",null,name,type);
         }
         else
         {
            this.call(this,"publish",null,name);
         }
      }
      
      private native function invoke(param1:uint, ... rest) : *;
      
      private native function invokeWithArgsArray(param1:uint, param2:Array) : *;
      
      public function get time() : Number
      {
         return this.invoke(kGetTime);
      }
      
      public function get currentFPS() : Number
      {
         return this.invoke(kGetCurrentFps);
      }
      
      public function get bufferLength() : Number
      {
         return this.invoke(kGetBufferLength);
      }
      
      public function get liveDelay() : Number
      {
         return this.invoke(kGetLiveDelay);
      }
      
      public function get bytesLoaded() : uint
      {
         return this.invoke(kGetBytesLoaded);
      }
      
      public function get bytesTotal() : uint
      {
         return this.invoke(kGetBytesTotal);
      }
      
      [Inspectable(environment="none")]
      public function get decodedFrames() : uint
      {
         return this.invoke(kGetTotalFrames);
      }
      
      [Inspectable(environment="none")]
      public function get videoCodec() : uint
      {
         return this.invoke(kGetVideoCodecID);
      }
      
      [Inspectable(environment="none")]
      public function get audioCodec() : uint
      {
         return this.invoke(kGetAudioCodecID);
      }
      
      public native function get soundTransform() : SoundTransform;
      
      public native function set soundTransform(param1:SoundTransform) : void;
      
      public native function get checkPolicyFile() : Boolean;
      
      public native function set checkPolicyFile(param1:Boolean) : void;
      
      public native function get client() : Object;
      
      public native function set client(param1:Object) : void;
      
      public native function get objectEncoding() : uint;
      
      [Version("10.1")]
      public native function get multicastPushNeighborLimit() : Number;
      
      [Version("10.1")]
      public native function set multicastPushNeighborLimit(param1:Number) : void;
      
      [Version("10.1")]
      public native function get multicastWindowDuration() : Number;
      
      [Version("10.1")]
      public native function set multicastWindowDuration(param1:Number) : void;
      
      [Version("10.1")]
      public native function get multicastRelayMarginDuration() : Number;
      
      [Version("10.1")]
      public native function set multicastRelayMarginDuration(param1:Number) : void;
      
      [Version("10.1")]
      public native function get multicastAvailabilityUpdatePeriod() : Number;
      
      [Version("10.1")]
      public native function set multicastAvailabilityUpdatePeriod(param1:Number) : void;
      
      [Version("10.1")]
      public native function get multicastFetchPeriod() : Number;
      
      [Version("10.1")]
      public native function set multicastFetchPeriod(param1:Number) : void;
      
      [Version("10.1")]
      public native function get multicastAvailabilitySendToAll() : Boolean;
      
      [Version("10.1")]
      public native function set multicastAvailabilitySendToAll(param1:Boolean) : void;
      
      [Version("10")]
      public native function get farID() : String;
      
      [Version("10")]
      public native function get nearNonce() : String;
      
      [Version("10")]
      public native function get farNonce() : String;
      
      [Version("10")]
      public native function get peerStreams() : Array;
      
      [Version("10")]
      public function onPeerConnect(subscriber:NetStream) : Boolean
      {
         return true;
      }
      
      [Version("10.1")]
      public native function get audioReliable() : Boolean;
      
      [Version("10.1")]
      public native function set audioReliable(param1:Boolean) : void;
      
      [Version("10.1")]
      public native function get videoReliable() : Boolean;
      
      [Version("10.1")]
      public native function set videoReliable(param1:Boolean) : void;
      
      [Version("10.1")]
      public native function get dataReliable() : Boolean;
      
      [Version("10.1")]
      public native function set dataReliable(param1:Boolean) : void;
      
      [Version("10.1")]
      public native function get audioSampleAccess() : Boolean;
      
      [Version("10.1")]
      public native function set audioSampleAccess(param1:Boolean) : void;
      
      [Version("10.1")]
      public native function get videoSampleAccess() : Boolean;
      
      [Version("10.1")]
      public native function set videoSampleAccess(param1:Boolean) : void;
      
      [Version("10.1")]
      public native function appendBytes(param1:ByteArray) : void;
      
      [Version("10.1")]
      public native function appendBytesAction(param1:String) : void;
      
      public native function get useHardwareDecoder() : Boolean;
      
      public native function set useHardwareDecoder(param1:Boolean) : void;
      
      [API("680")]
      public native function get useJitterBuffer() : Boolean;
      
      [API("680")]
      public native function set useJitterBuffer(param1:Boolean) : void;
      
      [API("674")]
      public native function get videoStreamSettings() : VideoStreamSettings;
      
      [API("674")]
      public native function set videoStreamSettings(param1:VideoStreamSettings) : void;
   }
}

