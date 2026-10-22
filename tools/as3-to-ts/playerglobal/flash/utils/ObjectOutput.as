package flash.utils
{
   [native(cls="ObjectOutputClass",gc="exact",instance="ObjectOutputObject",methods="auto",construct="native")]
   internal class ObjectOutput implements IDataOutput
   {
      
      public function ObjectOutput()
      {
         super();
      }
      
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
      
      public native function writeObject(param1:*) : void;
      
      public native function get objectEncoding() : uint;
      
      public native function set objectEncoding(param1:uint) : void;
      
      public native function get endian() : String;
      
      public native function set endian(param1:String) : void;
   }
}

