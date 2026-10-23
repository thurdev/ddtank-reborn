package flash.display
{
   import flash.accessibility.AccessibilityProperties;
   import flash.events.EventDispatcher;
   import flash.geom.Point;
   import flash.geom.Rectangle;
   import flash.geom.Transform;
   import flash.geom.Vector3D;
   
   [native(cls="DisplayObjectClass",gc="exact",instance="DisplayObject",methods="auto",construct="abstract-restricted")]
   [Event(name="render",type="flash.events.Event")]
   [Event(name="removedFromStage",type="flash.events.Event")]
   [Event(name="removed",type="flash.events.Event")]
   [Event(name="exitFrame",type="flash.events.Event")]
   [Event(name="frameConstructed",type="flash.events.Event")]
   [Event(name="enterFrame",type="flash.events.Event")]
   [Event(name="addedToStage",type="flash.events.Event")]
   [Event(name="added",type="flash.events.Event")]
   public class DisplayObject extends EventDispatcher implements IBitmapDrawable
   {
      
      public function DisplayObject()
      {
         super();
      }
      
      public native function get root() : DisplayObject;
      
      public native function get stage() : Stage;
      
      public native function get name() : String;
      
      public native function set name(param1:String) : void;
      
      public native function get parent() : DisplayObjectContainer;
      
      public native function get mask() : DisplayObject;
      
      public native function set mask(param1:DisplayObject) : void;
      
      public native function get visible() : Boolean;
      
      public native function set visible(param1:Boolean) : void;
      
      public native function get x() : Number;
      
      public native function set x(param1:Number) : void;
      
      public native function get y() : Number;
      
      public native function set y(param1:Number) : void;
      
      [Version("10")]
      public native function get z() : Number;
      
      [Version("10")]
      public native function set z(param1:Number) : void;
      
      public native function get scaleX() : Number;
      
      public native function set scaleX(param1:Number) : void;
      
      public native function get scaleY() : Number;
      
      public native function set scaleY(param1:Number) : void;
      
      [Version("10")]
      public native function get scaleZ() : Number;
      
      [Version("10")]
      public native function set scaleZ(param1:Number) : void;
      
      public native function get mouseX() : Number;
      
      public native function get mouseY() : Number;
      
      public native function get rotation() : Number;
      
      public native function set rotation(param1:Number) : void;
      
      [Version("10")]
      public native function get rotationX() : Number;
      
      [Version("10")]
      public native function set rotationX(param1:Number) : void;
      
      [Version("10")]
      public native function get rotationY() : Number;
      
      [Version("10")]
      public native function set rotationY(param1:Number) : void;
      
      [Version("10")]
      public native function get rotationZ() : Number;
      
      [Version("10")]
      public native function set rotationZ(param1:Number) : void;
      
      public native function get alpha() : Number;
      
      public native function set alpha(param1:Number) : void;
      
      public native function get width() : Number;
      
      public native function set width(param1:Number) : void;
      
      public native function get height() : Number;
      
      public native function set height(param1:Number) : void;
      
      public native function get cacheAsBitmap() : Boolean;
      
      public native function set cacheAsBitmap(param1:Boolean) : void;
      
      public native function get opaqueBackground() : Object;
      
      public native function set opaqueBackground(param1:Object) : void;
      
      public native function get scrollRect() : Rectangle;
      
      public native function set scrollRect(param1:Rectangle) : void;
      
      public native function get filters() : Array;
      
      public native function set filters(param1:Array) : void;
      
      public native function get blendMode() : String;
      
      public native function set blendMode(param1:String) : void;
      
      public native function get transform() : Transform;
      
      public native function set transform(param1:Transform) : void;
      
      public native function get scale9Grid() : Rectangle;
      
      public native function set scale9Grid(param1:Rectangle) : void;
      
      public native function globalToLocal(param1:Point) : Point;
      
      public native function localToGlobal(param1:Point) : Point;
      
      public native function getBounds(param1:DisplayObject) : Rectangle;
      
      public native function getRect(param1:DisplayObject) : Rectangle;
      
      public native function get loaderInfo() : LoaderInfo;
      
      public function hitTestObject(obj:DisplayObject) : Boolean
      {
         return this._hitTest(false,0,0,false,obj);
      }
      
      public function hitTestPoint(x:Number, y:Number, shapeFlag:Boolean = false) : Boolean
      {
         return this._hitTest(true,x,y,shapeFlag,null);
      }
      
      private native function _hitTest(param1:Boolean, param2:Number, param3:Number, param4:Boolean, param5:DisplayObject) : Boolean;
      
      public native function get accessibilityProperties() : AccessibilityProperties;
      
      public native function set accessibilityProperties(param1:AccessibilityProperties) : void;
      
      [Version("10")]
      public native function globalToLocal3D(param1:Point) : Vector3D;
      
      [Version("10")]
      public native function local3DToGlobal(param1:Vector3D) : Point;
      
      [Version("10")]
      public native function set blendShader(param1:Shader) : void;
      
      [API("686")]
      public native function get metaData() : Object;
      
      [API("686")]
      public native function set metaData(param1:Object) : void;
   }
}

