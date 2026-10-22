package flash.geom
{
   [native(cls="Matrix3DClass",instance="Matrix3DObject",methods="auto")]
   [Version("10")]
   public class Matrix3D
   {
      
      public function Matrix3D(v:Vector.<Number> = null)
      {
         super();
         this.ctor(v);
      }
      
      public static native function interpolate(param1:Matrix3D, param2:Matrix3D, param3:Number) : Matrix3D;
      
      private native function ctor(param1:Vector.<Number>) : void;
      
      public native function clone() : Matrix3D;
      
      public native function copyToMatrix3D(param1:Matrix3D) : void;
      
      public native function get rawData() : Vector.<Number>;
      
      public native function set rawData(param1:Vector.<Number>) : void;
      
      public native function append(param1:Matrix3D) : void;
      
      public native function prepend(param1:Matrix3D) : void;
      
      public native function invert() : Boolean;
      
      public native function identity() : void;
      
      public native function decompose(param1:String = "eulerAngles") : Vector.<Vector3D>;
      
      public native function recompose(param1:Vector.<Vector3D>, param2:String = "eulerAngles") : Boolean;
      
      public native function get position() : Vector3D;
      
      public native function set position(param1:Vector3D) : void;
      
      public native function appendTranslation(param1:Number, param2:Number, param3:Number) : void;
      
      public native function appendRotation(param1:Number, param2:Vector3D, param3:Vector3D = null) : void;
      
      public native function appendScale(param1:Number, param2:Number, param3:Number) : void;
      
      public native function prependTranslation(param1:Number, param2:Number, param3:Number) : void;
      
      public native function prependRotation(param1:Number, param2:Vector3D, param3:Vector3D = null) : void;
      
      public native function prependScale(param1:Number, param2:Number, param3:Number) : void;
      
      public native function transformVector(param1:Vector3D) : Vector3D;
      
      public native function deltaTransformVector(param1:Vector3D) : Vector3D;
      
      public native function transformVectors(param1:Vector.<Number>, param2:Vector.<Number>) : void;
      
      public native function get determinant() : Number;
      
      public native function transpose() : void;
      
      public native function pointAt(param1:Vector3D, param2:Vector3D = null, param3:Vector3D = null) : void;
      
      public native function interpolateTo(param1:Matrix3D, param2:Number) : void;
      
      [API("674")]
      public native function copyFrom(param1:Matrix3D) : void;
      
      [API("674")]
      public native function copyRawDataTo(param1:Vector.<Number>, param2:uint = 0, param3:Boolean = false) : void;
      
      [API("674")]
      public native function copyRawDataFrom(param1:Vector.<Number>, param2:uint = 0, param3:Boolean = false) : void;
      
      [API("674")]
      public native function copyRowTo(param1:uint, param2:Vector3D) : void;
      
      [API("674")]
      public native function copyColumnTo(param1:uint, param2:Vector3D) : void;
      
      [API("674")]
      public native function copyRowFrom(param1:uint, param2:Vector3D) : void;
      
      [API("674")]
      public native function copyColumnFrom(param1:uint, param2:Vector3D) : void;
   }
}

