package flash.utils
{
   [native(cls="ByteArrayClass",gc="exact",instance="ByteArrayObject",methods="auto")]
   public class ByteArray implements IDataInput2, IDataOutput2
   {
      
      private static var _defaultObjectEncoding:uint;
      
      prototype.toJSON = function(k:String):*
      {
         return "ByteArray";
      };
      _dontEnumPrototype(prototype);
      
      public function ByteArray()
      {
         super();
      }
      
      public static native function get defaultObjectEncoding() : uint;
      
      public static native function set defaultObjectEncoding(param1:uint) : void;
      
      public native function readBytes(param1:ByteArray, param2:uint = 0, param3:uint = 0) : void;
      
      public native function writeBytes(param1:ByteArray, param2:uint = 0, param3:uint = 0) : void;
      
      public native function writeBoolean(param1:Boolean) : void;
      
      public native function writeByte(param1:int) : void;
      
      public native function writeShort(param1:int) : void;
      
      public native function writeInt(param1:int) : void;
      
      public native function writeUnsignedInt(param1:uint) : void;
      
      public native function writeFloat(param1:Number) : void;
      
      public native function writeDouble(param1:Number) : void;
      
      public native function writeMultiByte(param1:String, param2:String) : void;
      
      public native function writeUTF(param1:String) : void;
      
      public native function writeUTFBytes(param1:String) : void;
      
      public native function readBoolean() : Boolean;
      
      public native function readByte() : int;
      
      public native function readUnsignedByte() : uint;
      
      public native function readShort() : int;
      
      public native function readUnsignedShort() : uint;
      
      public native function readInt() : int;
      
      public native function readUnsignedInt() : uint;
      
      public native function readFloat() : Number;
      
      public native function readDouble() : Number;
      
      public native function readMultiByte(param1:uint, param2:String) : String;
      
      public native function readUTF() : String;
      
      public native function readUTFBytes(param1:uint) : String;
      
      public native function get length() : uint;
      
      public native function set length(param1:uint) : void;
      
      public native function writeObject(param1:*) : void;
      
      public native function readObject() : *;
      
      [API("662")]
      public function deflate() : void
      {
         this._compress("deflate");
      }
      
      private native function _compress(param1:String) : void;
      
      public function compress(algorithm:String = "zlib") : void
      {
         this._compress(algorithm);
      }
      
      [API("662")]
      public function inflate() : void
      {
         this._uncompress("deflate");
      }
      
      private native function _uncompress(param1:String) : void;
      
      public function uncompress(algorithm:String = "zlib") : void
      {
         this._uncompress(algorithm);
      }
      
      public function toString() : String
      {
         return this._toString();
      }
      
      private native function _toString() : String;
      
      public native function get bytesAvailable() : uint;
      
      public native function get position() : uint;
      
      public native function set position(param1:uint) : void;
      
      public native function get objectEncoding() : uint;
      
      public native function set objectEncoding(param1:uint) : void;
      
      public native function get endian() : String;
      
      public native function set endian(param1:String) : void;
      
      [API("662")]
      public native function clear() : void;
      
      [API("682")]
      public native function atomicCompareAndSwapIntAt(param1:int, param2:int, param3:int) : int;
      
      [API("682")]
      public native function atomicCompareAndSwapLength(param1:int, param2:int) : int;
      
      [API("682")]
      public native function get shareable() : Boolean;
      
      [API("682")]
      public native function set shareable(param1:Boolean) : void;
   }
}

