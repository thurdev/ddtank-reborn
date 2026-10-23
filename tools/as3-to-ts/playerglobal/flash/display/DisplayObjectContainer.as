package flash.display
{
   import flash.geom.Point;
   import flash.text.TextSnapshot;
   
   [native(cls="ContainerClass",gc="exact",instance="ContainerObject",methods="auto",construct="abstract-restricted")]
   public class DisplayObjectContainer extends InteractiveObject
   {
      
      public function DisplayObjectContainer()
      {
         super();
      }
      
      [cppcall]
      public native function addChild(param1:DisplayObject) : DisplayObject;
      
      public native function addChildAt(param1:DisplayObject, param2:int) : DisplayObject;
      
      public native function removeChild(param1:DisplayObject) : DisplayObject;
      
      public native function removeChildAt(param1:int) : DisplayObject;
      
      public native function getChildIndex(param1:DisplayObject) : int;
      
      public native function setChildIndex(param1:DisplayObject, param2:int) : void;
      
      public native function getChildAt(param1:int) : DisplayObject;
      
      public native function getChildByName(param1:String) : DisplayObject;
      
      public native function get numChildren() : int;
      
      public native function get textSnapshot() : TextSnapshot;
      
      public native function getObjectsUnderPoint(param1:Point) : Array;
      
      public native function areInaccessibleObjectsUnderPoint(param1:Point) : Boolean;
      
      public native function get tabChildren() : Boolean;
      
      public native function set tabChildren(param1:Boolean) : void;
      
      public native function get mouseChildren() : Boolean;
      
      public native function set mouseChildren(param1:Boolean) : void;
      
      public native function contains(param1:DisplayObject) : Boolean;
      
      public native function swapChildrenAt(param1:int, param2:int) : void;
      
      public native function swapChildren(param1:DisplayObject, param2:DisplayObject) : void;
      
      [API("674")]
      public native function removeChildren(param1:int = 0, param2:int = 2147483647) : void;
      
      [API("690")]
      public native function stopAllMovieClips() : void;
   }
}

