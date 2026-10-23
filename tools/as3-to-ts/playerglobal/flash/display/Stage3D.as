package flash.display
{
   import flash.display3D.Context3D;
   import flash.events.EventDispatcher;
   
   [native(cls="Stage3DClass",instance="Stage3DObject",methods="auto",construct="native")]
   [API("674")]
   [Event(name="error",type="flash.events.ErrorEvent")]
   [Event(name="context3DCreate",type="flash.events.Event")]
   public class Stage3D extends EventDispatcher
   {
      
      public function Stage3D()
      {
         super();
      }
      
      public native function get context3D() : Context3D;
      
      public native function requestContext3D(param1:String = "auto", param2:String = "baseline") : void;
      
      [API("692")]
      public native function requestContext3DMatchingProfiles(param1:Vector.<String>) : void;
      
      public native function get x() : Number;
      
      public native function set x(param1:Number) : void;
      
      public native function get y() : Number;
      
      public native function set y(param1:Number) : void;
      
      public native function get visible() : Boolean;
      
      public native function set visible(param1:Boolean) : void;
   }
}

