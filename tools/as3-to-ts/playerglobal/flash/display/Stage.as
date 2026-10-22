package flash.display
{
   import flash.accessibility.AccessibilityImplementation;
   import flash.accessibility.AccessibilityProperties;
   import flash.errors.*;
   import flash.events.Event;
   import flash.geom.Rectangle;
   import flash.geom.Transform;
   import flash.media.StageVideo;
   import flash.text.TextSnapshot;
   import flash.ui.ContextMenu;
   
   [native(cls="StageClass",gc="exact",instance="StageObject",methods="auto",construct="native")]
   [Event(name="stageVideoAvailability",type="flash.events.StageVideoAvailabilityEvent")]
   [Event(name="orientationChange",type="flash.events.StageOrientationEvent")]
   [Event(name="orientationChanging",type="flash.events.StageOrientationEvent")]
   [Event(name="VsyncStateChangeAvailability",type="flash.events.VsyncStateChangeAvailabilityEvent")]
   [Event(name="fullScreen",type="flash.events.FullScreenEvent")]
   [Event(name="browserZoomChange",type="flash.events.Event")]
   [Event(name="resize",type="flash.events.Event")]
   [Event(name="mouseLeave",type="flash.events.Event")]
   public class Stage extends DisplayObjectContainer
   {
      
      private static const kInvalidParamError:uint = 2004;
      
      public function Stage()
      {
         super();
      }
      
      [Exclude(name="y",kind="property")]
      [Exclude(name="x",kind="property")]
      [Exclude(name="visible",kind="property")]
      [Exclude(name="transform",kind="property")]
      [Exclude(name="tabIndex",kind="property")]
      [Exclude(name="tabEnabled",kind="property")]
      [Exclude(name="scrollRect",kind="property")]
      [Exclude(name="scaleY",kind="property")]
      [Exclude(name="scaleX",kind="property")]
      [Exclude(name="scale9Grid",kind="property")]
      [Exclude(name="rotation",kind="property")]
      [Exclude(name="opaqueBackground",kind="property")]
      [Exclude(name="name",kind="property")]
      [Exclude(name="mouseEnabled",kind="property")]
      [Exclude(name="mask",kind="property")]
      [Exclude(name="loaderInfo",kind="property")]
      [Exclude(name="focusRect",kind="property")]
      [Exclude(name="filters",kind="property")]
      [Exclude(name="contextMenu",kind="property")]
      [Exclude(name="cacheAsBitmap",kind="property")]
      [Exclude(name="blendMode",kind="property")]
      [Exclude(name="alpha",kind="property")]
      [Exclude(name="accessibilityProperties",kind="property")]
      [Exclude(name="accessibilityImplementation",kind="property")]
      public native function get frameRate() : Number;
      
      public native function set frameRate(param1:Number) : void;
      
      public native function invalidate() : void;
      
      public native function get scaleMode() : String;
      
      public native function set scaleMode(param1:String) : void;
      
      public native function get align() : String;
      
      public native function set align(param1:String) : void;
      
      public native function get stageWidth() : int;
      
      public native function set stageWidth(param1:int) : void;
      
      public native function get stageHeight() : int;
      
      public native function set stageHeight(param1:int) : void;
      
      public native function get showDefaultContextMenu() : Boolean;
      
      public native function set showDefaultContextMenu(param1:Boolean) : void;
      
      public native function get focus() : InteractiveObject;
      
      public native function set focus(param1:InteractiveObject) : void;
      
      [Version("10")]
      public native function get colorCorrection() : String;
      
      [Version("10")]
      public native function set colorCorrection(param1:String) : void;
      
      [Version("10")]
      public native function get colorCorrectionSupport() : String;
      
      public native function isFocusInaccessible() : Boolean;
      
      public native function get stageFocusRect() : Boolean;
      
      public native function set stageFocusRect(param1:Boolean) : void;
      
      public native function get quality() : String;
      
      public native function set quality(param1:String) : void;
      
      public native function get displayState() : String;
      
      public native function set displayState(param1:String) : void;
      
      public native function get fullScreenSourceRect() : Rectangle;
      
      public native function set fullScreenSourceRect(param1:Rectangle) : void;
      
      [API("678")]
      public native function get mouseLock() : Boolean;
      
      [API("678")]
      public native function set mouseLock(param1:Boolean) : void;
      
      [API("667")]
      public native function get stageVideos() : Vector.<StageVideo>;
      
      [API("674")]
      public native function get stage3Ds() : Vector.<Stage3D>;
      
      [API("670")]
      public native function get color() : uint;
      
      [API("670")]
      public native function set color(param1:uint) : void;
      
      public native function get fullScreenWidth() : uint;
      
      public native function get fullScreenHeight() : uint;
      
      [Version("10.0.32")]
      public native function get wmodeGPU() : Boolean;
      
      [API("670")]
      public native function get softKeyboardRect() : Rectangle;
      
      override public function set name(value:String) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function set mask(value:DisplayObject) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function set visible(value:Boolean) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function set x(value:Number) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function set y(value:Number) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      [Version("10")]
      override public function set z(value:Number) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function set scaleX(value:Number) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function set scaleY(value:Number) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      [Version("10")]
      override public function set scaleZ(value:Number) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function set rotation(value:Number) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      [Version("10")]
      override public function set rotationX(value:Number) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      [Version("10")]
      override public function set rotationY(value:Number) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      [Version("10")]
      override public function set rotationZ(value:Number) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function set alpha(value:Number) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function set cacheAsBitmap(value:Boolean) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function set opaqueBackground(value:Object) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function set scrollRect(value:Rectangle) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function set filters(value:Array) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function set blendMode(value:String) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function set transform(value:Transform) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function set accessibilityProperties(value:AccessibilityProperties) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function set scale9Grid(value:Rectangle) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function set tabEnabled(value:Boolean) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function set tabIndex(value:int) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function set focusRect(value:Object) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function set mouseEnabled(value:Boolean) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function set accessibilityImplementation(value:AccessibilityImplementation) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function addChild(child:DisplayObject) : DisplayObject
      {
         this.requireOwnerPermissions();
         return super.addChild(child);
      }
      
      override public function addChildAt(child:DisplayObject, index:int) : DisplayObject
      {
         this.requireOwnerPermissions();
         return super.addChildAt(child,index);
      }
      
      override public function setChildIndex(child:DisplayObject, index:int) : void
      {
         this.requireOwnerPermissions();
         super.setChildIndex(child,index);
      }
      
      override public function addEventListener(type:String, listener:Function, useCapture:Boolean = false, priority:int = 0, useWeakReference:Boolean = false) : void
      {
         this.requireOwnerPermissions();
         super.addEventListener(type,listener,useCapture,priority,useWeakReference);
      }
      
      override public function dispatchEvent(event:Event) : Boolean
      {
         this.requireOwnerPermissions();
         return super.dispatchEvent(event);
      }
      
      override public function hasEventListener(type:String) : Boolean
      {
         this.requireOwnerPermissions();
         return super.hasEventListener(type);
      }
      
      override public function willTrigger(type:String) : Boolean
      {
         this.requireOwnerPermissions();
         return super.willTrigger(type);
      }
      
      override public function get width() : Number
      {
         this.requireOwnerPermissions();
         return super.width;
      }
      
      override public function set width(value:Number) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function get height() : Number
      {
         this.requireOwnerPermissions();
         return super.height;
      }
      
      override public function set height(value:Number) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
      
      override public function get textSnapshot() : TextSnapshot
      {
         Error.throwError(IllegalOperationError,2071);
         return null;
      }
      
      override public function get mouseChildren() : Boolean
      {
         this.requireOwnerPermissions();
         return super.mouseChildren;
      }
      
      override public function set mouseChildren(value:Boolean) : void
      {
         this.requireOwnerPermissions();
         super.mouseChildren = value;
      }
      
      override public function get numChildren() : int
      {
         this.requireOwnerPermissions();
         return super.numChildren;
      }
      
      override public function get tabChildren() : Boolean
      {
         this.requireOwnerPermissions();
         return super.tabChildren;
      }
      
      override public function set tabChildren(value:Boolean) : void
      {
         this.requireOwnerPermissions();
         super.tabChildren = value;
      }
      
      [API("670")]
      public native function get allowsFullScreen() : Boolean;
      
      [API("680")]
      public native function get allowsFullScreenInteractive() : Boolean;
      
      override public native function removeChildAt(param1:int) : DisplayObject;
      
      override public native function swapChildrenAt(param1:int, param2:int) : void;
      
      [API("682")]
      public native function get contentsScaleFactor() : Number;
      
      [API("700")]
      public native function get browserZoomFactor() : Number;
      
      private native function requireOwnerPermissions() : void;
      
      [API("674")]
      public native function get displayContextInfo() : String;
      
      public function get constructor() : *
      {
         return null;
      }
      
      public function set constructor(c:*) : *
      {
      }
      
      override public function set contextMenu(value:ContextMenu) : void
      {
         Error.throwError(IllegalOperationError,2071);
      }
   }
}

