package flash.media
{
   import flash.display.BitmapData;
   import flash.events.EventDispatcher;
   import flash.geom.Rectangle;
   import flash.utils.ByteArray;
   
   [native(cls="CameraClass",instance="CameraObject",methods="auto",construct="check")]
   [Event(name="videoFrame",type="flash.events.Event")]
   [Event(name="status",type="flash.events.StatusEvent")]
   [Event(name="permissionStatus",type="flash.events.PermissionEvent")]
   [Event(name="activity",type="flash.events.ActivityEvent")]
   public final class Camera extends EventDispatcher
   {
      
      public function Camera()
      {
         super();
      }
      
      internal static native function _scanHardware() : void;
      
      public static native function get names() : Array;
      
      [Version("10.1")]
      public static native function get isSupported() : Boolean;
      
      public static native function getCamera(param1:String = null) : Camera;
      
      public native function get activityLevel() : Number;
      
      public native function get bandwidth() : int;
      
      public native function get currentFPS() : Number;
      
      public native function get fps() : Number;
      
      public native function get height() : int;
      
      public native function get index() : int;
      
      public native function get keyFrameInterval() : int;
      
      public native function get loopback() : Boolean;
      
      public native function get motionLevel() : int;
      
      public native function get motionTimeout() : int;
      
      public native function get muted() : Boolean;
      
      public native function get name() : String;
      
      [API("675")]
      public native function get position() : String;
      
      public native function get quality() : int;
      
      public native function get width() : int;
      
      [Inspectable(environment="none")]
      public native function setCursor(param1:Boolean) : void;
      
      public native function setKeyFrameInterval(param1:int) : void;
      
      public native function setLoopback(param1:Boolean = false) : void;
      
      public native function setMode(param1:int, param2:int, param3:Number, param4:Boolean = true) : void;
      
      public native function setMotionLevel(param1:int, param2:int = 2000) : void;
      
      public native function setQuality(param1:int, param2:int) : void;
      
      [API("682")]
      public native function drawToBitmapData(param1:BitmapData) : void;
      
      [API("682")]
      public native function copyToByteArray(param1:Rectangle, param2:ByteArray) : void;
      
      [API("682")]
      public native function copyToVector(param1:Rectangle, param2:Vector.<uint>) : void;
   }
}

