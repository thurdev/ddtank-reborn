package flash.media
{
   import flash.events.EventDispatcher;
   import flash.geom.Point;
   import flash.geom.Rectangle;
   import flash.net.NetStream;
   
   [native(cls="StageVideoClass",instance="StageVideoObject",methods="auto",construct="native")]
   [API("667")]
   [Event(name="renderState",type="flash.events.StageVideoEvent")]
   public class StageVideo extends EventDispatcher
   {
      
      public function StageVideo()
      {
         super();
      }
      
      public native function attachNetStream(param1:NetStream) : void;
      
      [API("682")]
      public native function attachCamera(param1:Camera) : void;
      
      public native function get viewPort() : Rectangle;
      
      public native function set viewPort(param1:Rectangle) : void;
      
      public native function set pan(param1:Point) : void;
      
      public native function get pan() : Point;
      
      public native function set zoom(param1:Point) : void;
      
      public native function get zoom() : Point;
      
      public native function set depth(param1:int) : void;
      
      public native function get depth() : int;
      
      public native function get videoWidth() : int;
      
      public native function get videoHeight() : int;
      
      public native function get colorSpaces() : Vector.<String>;
      
      [API("688")]
      public native function attachAVStream(param1:AVStream) : void;
   }
}

