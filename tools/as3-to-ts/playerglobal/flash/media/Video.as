package flash.media
{
   import flash.display.DisplayObject;
   import flash.net.NetStream;
   
   [native(cls="VideoClass",instance="VideoObject",methods="auto")]
   public class Video extends DisplayObject
   {
      
      public function Video(width:int = 320, height:int = 240)
      {
         super();
         this.ctor(width,height);
      }
      
      private native function ctor(param1:int, param2:int) : void;
      
      public native function get deblocking() : int;
      
      public native function set deblocking(param1:int) : void;
      
      public native function get smoothing() : Boolean;
      
      public native function set smoothing(param1:Boolean) : void;
      
      public native function get videoWidth() : int;
      
      public native function get videoHeight() : int;
      
      public native function clear() : void;
      
      public native function attachNetStream(param1:NetStream) : void;
      
      public native function attachCamera(param1:Camera) : void;
   }
}

