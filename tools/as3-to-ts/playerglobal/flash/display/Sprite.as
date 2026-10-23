package flash.display
{
   import flash.geom.Rectangle;
   import flash.media.SoundTransform;
   
   [native(cls="SpriteClass",gc="exact",instance="SpriteObject",methods="auto")]
   public class Sprite extends DisplayObjectContainer
   {
      
      public function Sprite()
      {
         super();
         this.constructChildren();
      }
      
      public native function get graphics() : Graphics;
      
      public native function get buttonMode() : Boolean;
      
      public native function set buttonMode(param1:Boolean) : void;
      
      public native function startDrag(param1:Boolean = false, param2:Rectangle = null) : void;
      
      public native function stopDrag() : void;
      
      [API("667")]
      public native function startTouchDrag(param1:int, param2:Boolean = false, param3:Rectangle = null) : void;
      
      [API("667")]
      public native function stopTouchDrag(param1:int) : void;
      
      public native function get dropTarget() : DisplayObject;
      
      private native function constructChildren() : void;
      
      public native function get hitArea() : Sprite;
      
      public native function set hitArea(param1:Sprite) : void;
      
      public native function get useHandCursor() : Boolean;
      
      public native function set useHandCursor(param1:Boolean) : void;
      
      public native function get soundTransform() : SoundTransform;
      
      public native function set soundTransform(param1:SoundTransform) : void;
   }
}

