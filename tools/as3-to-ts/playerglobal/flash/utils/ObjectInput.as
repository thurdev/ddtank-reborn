package flash.utils
{
   [native(cls="ObjectInputClass",gc="exact",instance="ObjectInputObject",methods="auto",construct="native")]
   internal class ObjectInput implements IDataInput
   {
      
      public function ObjectInput()
      {
         super();
      }
      
      public native function readBytes(param1:ByteArray, param2:uint = 0, param3:uint = 0) : void;
      
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
      
      public native function get bytesAvailable() : uint;
      
      public native function readObject() : *;
      
      public native function get objectEncoding() : uint;
      
      public native function set objectEncoding(param1:uint) : void;
      
      public native function get endian() : String;
      
      public native function set endian(param1:String) : void;
   }
}

