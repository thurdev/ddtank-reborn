package flash.display
{
   import flash.accessibility.AccessibilityImplementation;
   import flash.geom.Rectangle;
   import flash.ui.ContextMenu;
   
   [native(cls="InteractiveObjectClass",gc="exact",instance="InteractiveObject",methods="auto",construct="abstract-restricted")]
   [Event(name="softKeyboardDeactivate",type="flash.events.SoftKeyboardEvent")]
   [Event(name="softKeyboardActivate",type="flash.events.SoftKeyboardEvent")]
   [Event(name="softKeyboardActivating",type="flash.events.SoftKeyboardEvent")]
   [Event(name="textInput",type="flash.events.TextEvent")]
   [Event(name="imeStartComposition",type="flash.events.IMEEvent")]
   [Event(name="contextMenu",type="flash.events.MouseEvent")]
   [Event(name="nativeDragComplete",type="flash.events.NativeDragEvent")]
   [Event(name="nativeDragUpdate",type="flash.events.NativeDragEvent")]
   [Event(name="nativeDragStart",type="flash.events.NativeDragEvent")]
   [Event(name="nativeDragExit",type="flash.events.NativeDragEvent")]
   [Event(name="nativeDragDrop",type="flash.events.NativeDragEvent")]
   [Event(name="nativeDragOver",type="flash.events.NativeDragEvent")]
   [Event(name="nativeDragEnter",type="flash.events.NativeDragEvent")]
   [Event(name="tabIndexChange",type="flash.events.Event")]
   [Event(name="tabEnabledChange",type="flash.events.Event")]
   [Event(name="tabChildrenChange",type="flash.events.Event")]
   [Event(name="keyUp",type="flash.events.KeyboardEvent")]
   [Event(name="keyDown",type="flash.events.KeyboardEvent")]
   [Event(name="rightMouseUp",type="flash.events.MouseEvent")]
   [Event(name="rightMouseDown",type="flash.events.MouseEvent")]
   [Event(name="rightClick",type="flash.events.MouseEvent")]
   [Event(name="middleMouseUp",type="flash.events.MouseEvent")]
   [Event(name="middleMouseDown",type="flash.events.MouseEvent")]
   [Event(name="middleClick",type="flash.events.MouseEvent")]
   [Event(name="gestureDirectionalTap",type="flash.events.TransformGestureEvent")]
   [Event(name="gestureSwipe",type="flash.events.TransformGestureEvent")]
   [Event(name="gestureZoom",type="flash.events.TransformGestureEvent")]
   [Event(name="gestureRotate",type="flash.events.TransformGestureEvent")]
   [Event(name="gestureTap",type="flash.events.TapGestureEvent")]
   [Event(name="gesturePan",type="flash.events.TransformGestureEvent")]
   [Event(name="gestureLongPress",type="flash.events.TapGestureEvent")]
   [Event(name="touchTap",type="flash.events.TouchEvent")]
   [Event(name="touchRollOver",type="flash.events.TouchEvent")]
   [Event(name="touchRollOut",type="flash.events.TouchEvent")]
   [Event(name="touchOver",type="flash.events.TouchEvent")]
   [Event(name="touchOut",type="flash.events.TouchEvent")]
   [Event(name="proximityRollOver",type="flash.events.TouchEvent")]
   [Event(name="proximityRollOut",type="flash.events.TouchEvent")]
   [Event(name="proximityOver",type="flash.events.TouchEvent")]
   [Event(name="proximityOut",type="flash.events.TouchEvent")]
   [Event(name="proximityMove",type="flash.events.TouchEvent")]
   [Event(name="proximityEnd",type="flash.events.TouchEvent")]
   [Event(name="proximityBegin",type="flash.events.TouchEvent")]
   [Event(name="touchMove",type="flash.events.TouchEvent")]
   [Event(name="touchEnd",type="flash.events.TouchEvent")]
   [Event(name="touchBegin",type="flash.events.TouchEvent")]
   [Event(name="rollOver",type="flash.events.MouseEvent")]
   [Event(name="rollOut",type="flash.events.MouseEvent")]
   [Event(name="mouseWheel",type="flash.events.MouseEvent")]
   [Event(name="releaseOutside",type="flash.events.MouseEvent")]
   [Event(name="mouseUp",type="flash.events.MouseEvent")]
   [Event(name="mouseOver",type="flash.events.MouseEvent")]
   [Event(name="mouseOut",type="flash.events.MouseEvent")]
   [Event(name="mouseMove",type="flash.events.MouseEvent")]
   [Event(name="mouseDown",type="flash.events.MouseEvent")]
   [Event(name="doubleClick",type="flash.events.MouseEvent")]
   [Event(name="click",type="flash.events.MouseEvent")]
   [Event(name="mouseFocusChange",type="flash.events.FocusEvent")]
   [Event(name="keyFocusChange",type="flash.events.FocusEvent")]
   [Event(name="focusOut",type="flash.events.FocusEvent")]
   [Event(name="focusIn",type="flash.events.FocusEvent")]
   [Event(name="selectAll",type="flash.events.Event")]
   [Event(name="paste",type="flash.events.Event")]
   [Event(name="cut",type="flash.events.Event")]
   [Event(name="copy",type="flash.events.Event")]
   [Event(name="clear",type="flash.events.Event")]
   public class InteractiveObject extends DisplayObject
   {
      
      public function InteractiveObject()
      {
         super();
      }
      
      public native function get tabEnabled() : Boolean;
      
      public native function set tabEnabled(param1:Boolean) : void;
      
      public native function get tabIndex() : int;
      
      public native function set tabIndex(param1:int) : void;
      
      public native function get focusRect() : Object;
      
      public native function set focusRect(param1:Object) : void;
      
      public native function get mouseEnabled() : Boolean;
      
      public native function set mouseEnabled(param1:Boolean) : void;
      
      public native function get doubleClickEnabled() : Boolean;
      
      public native function set doubleClickEnabled(param1:Boolean) : void;
      
      [Inspectable(environment="none")]
      public native function get accessibilityImplementation() : AccessibilityImplementation;
      
      public native function set accessibilityImplementation(param1:AccessibilityImplementation) : void;
      
      [API("670")]
      public native function get softKeyboardInputAreaOfInterest() : Rectangle;
      
      [API("670")]
      public native function set softKeyboardInputAreaOfInterest(param1:Rectangle) : void;
      
      [API("670")]
      public native function get needsSoftKeyboard() : Boolean;
      
      [API("670")]
      public native function set needsSoftKeyboard(param1:Boolean) : void;
      
      [API("670")]
      public native function requestSoftKeyboard() : Boolean;
      
      public native function get contextMenu() : ContextMenu;
      
      public native function set contextMenu(param1:ContextMenu) : void;
   }
}

