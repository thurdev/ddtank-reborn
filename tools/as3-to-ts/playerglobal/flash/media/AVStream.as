package flash.media
{
   import flash.events.*;
   import flash.net.*;
   
   [API("688")]
   [native(cls="AVStreamClass",instance="AVStreamObject",methods="auto")]
   [Event(name="drmStatus",type="flash.events.DRMStatusEvent")]
   [Event(name="drmError",type="flash.events.DRMErrorEvent")]
   [Event(name="avstatus",type="flash.events.AVStatusEvent")]
   public class AVStream extends EventDispatcher
   {
      
      public static const UNDEFINED:String = "undefined";
      
      public static const HARDWARE:String = "hardware";
      
      public static const SOFTWARE:String = "sofware";
      
      public function AVStream(source:AVSource)
      {
         super();
         this.ctor(source);
      }
      
      private native function ctor(param1:AVSource) : void;
      
      public native function dispose() : void;
      
      public native function set bufferTime(param1:Number) : void;
      
      public native function set initialBufferTime(param1:Number) : void;
      
      public native function set backBufferTime(param1:Number) : void;
      
      public native function get backBufferLength() : Number;
      
      public native function get droppedFrames() : int;
      
      public native function step(param1:int) : AVResult;
      
      public native function pause() : AVResult;
      
      public native function resume() : Boolean;
      
      public native function seek(param1:Number, param2:Boolean = true) : AVResult;
      
      public native function seekToLocalTime(param1:int, param2:Number) : AVResult;
      
      public native function seekToLivePoint() : AVResult;
      
      public native function play() : AVResult;
      
      public native function setPlaySpeed(param1:Number, param2:Number) : void;
      
      public native function fastForward(param1:Number) : AVResult;
      
      public native function rewind(param1:Number) : AVResult;
      
      public native function get playState() : AVPlayState;
      
      public native function get time() : Number;
      
      public native function get frameTime() : Number;
      
      public native function get currentFPS() : Number;
      
      public native function get bufferLength() : Number;
      
      public native function get volume() : Number;
      
      public native function set volume(param1:Number) : void;
      
      public native function get decoderType() : String;
      
      public native function get renderType() : String;
      
      public native function get useHardwareDecoder() : Boolean;
      
      public native function set useHardwareDecoder(param1:Boolean) : void;
      
      public native function set captionsEnabled(param1:Boolean) : void;
      
      public native function get captionsEnabled() : Boolean;
      
      public native function set captionStyle(param1:AVCaptionStyle) : void;
      
      public native function get clientLivePoint() : Number;
      
      public native function seekToKeyFrame(param1:Number, param2:Boolean = true) : AVResult;
   }
}

