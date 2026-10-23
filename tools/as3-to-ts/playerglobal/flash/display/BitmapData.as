package flash.display
{
   import flash.filters.BitmapFilter;
   import flash.geom.*;
   import flash.utils.ByteArray;
   
   [native(cls="BitmapDataClass",gc="exact",instance="BitmapDataObject",methods="auto")]
   public class BitmapData implements IBitmapDrawable
   {
      
      public function BitmapData(width:int, height:int, transparent:Boolean = true, fillColor:uint = 4294967295)
      {
         super();
         this.ctor(width,height,transparent,fillColor);
      }
      
      private native function ctor(param1:int, param2:int, param3:Boolean, param4:uint) : void;
      
      public native function clone() : BitmapData;
      
      public native function get width() : int;
      
      public native function get height() : int;
      
      public native function get transparent() : Boolean;
      
      public function get rect() : Rectangle
      {
         return new Rectangle(0,0,this.width,this.height);
      }
      
      public native function getPixel(param1:int, param2:int) : uint;
      
      public native function getPixel32(param1:int, param2:int) : uint;
      
      public native function setPixel(param1:int, param2:int, param3:uint) : void;
      
      public native function setPixel32(param1:int, param2:int, param3:uint) : void;
      
      public native function applyFilter(param1:BitmapData, param2:Rectangle, param3:Point, param4:BitmapFilter) : void;
      
      public native function colorTransform(param1:Rectangle, param2:ColorTransform) : void;
      
      public native function compare(param1:BitmapData) : Object;
      
      public native function copyChannel(param1:BitmapData, param2:Rectangle, param3:Point, param4:uint, param5:uint) : void;
      
      public native function copyPixels(param1:BitmapData, param2:Rectangle, param3:Point, param4:BitmapData = null, param5:Point = null, param6:Boolean = false) : void;
      
      public native function dispose() : void;
      
      public native function draw(param1:IBitmapDrawable, param2:Matrix = null, param3:ColorTransform = null, param4:String = null, param5:Rectangle = null, param6:Boolean = false) : void;
      
      [API("680")]
      public native function drawWithQuality(param1:IBitmapDrawable, param2:Matrix = null, param3:ColorTransform = null, param4:String = null, param5:Rectangle = null, param6:Boolean = false, param7:String = null) : void;
      
      public native function fillRect(param1:Rectangle, param2:uint) : void;
      
      public native function floodFill(param1:int, param2:int, param3:uint) : void;
      
      public native function generateFilterRect(param1:Rectangle, param2:BitmapFilter) : Rectangle;
      
      public native function getColorBoundsRect(param1:uint, param2:uint, param3:Boolean = true) : Rectangle;
      
      public native function getPixels(param1:Rectangle) : ByteArray;
      
      [API("682")]
      public native function copyPixelsToByteArray(param1:Rectangle, param2:ByteArray) : void;
      
      [Version("10")]
      public native function getVector(param1:Rectangle) : Vector.<uint>;
      
      public native function hitTest(param1:Point, param2:uint, param3:Object, param4:Point = null, param5:uint = 1) : Boolean;
      
      public native function merge(param1:BitmapData, param2:Rectangle, param3:Point, param4:uint, param5:uint, param6:uint, param7:uint) : void;
      
      public native function noise(param1:int, param2:uint = 0, param3:uint = 255, param4:uint = 7, param5:Boolean = false) : void;
      
      public native function paletteMap(param1:BitmapData, param2:Rectangle, param3:Point, param4:Array = null, param5:Array = null, param6:Array = null, param7:Array = null) : void;
      
      public native function perlinNoise(param1:Number, param2:Number, param3:uint, param4:int, param5:Boolean, param6:Boolean, param7:uint = 7, param8:Boolean = false, param9:Array = null) : void;
      
      public native function pixelDissolve(param1:BitmapData, param2:Rectangle, param3:Point, param4:int = 0, param5:int = 0, param6:uint = 0) : int;
      
      public native function scroll(param1:int, param2:int) : void;
      
      public native function setPixels(param1:Rectangle, param2:ByteArray) : void;
      
      [Version("10")]
      public native function setVector(param1:Rectangle, param2:Vector.<uint>) : void;
      
      public native function threshold(param1:BitmapData, param2:Rectangle, param3:Point, param4:String, param5:uint, param6:uint = 0, param7:uint = 4294967295, param8:Boolean = false) : uint;
      
      public native function lock() : void;
      
      public native function unlock(param1:Rectangle = null) : void;
      
      [Version("10")]
      public native function histogram(param1:Rectangle = null) : Vector.<Vector.<Number>>;
      
      [API("680")]
      public native function encode(param1:Rectangle, param2:Object, param3:ByteArray = null) : ByteArray;
   }
}

