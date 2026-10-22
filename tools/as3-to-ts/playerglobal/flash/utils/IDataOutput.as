package flash.utils
{
   public interface IDataOutput
   {
      
      function writeBytes(param1:ByteArray, param2:uint = 0, param3:uint = 0) : void;
      
      function writeBoolean(param1:Boolean) : void;
      
      function writeByte(param1:int) : void;
      
      function writeShort(param1:int) : void;
      
      function writeInt(param1:int) : void;
      
      function writeUnsignedInt(param1:uint) : void;
      
      function writeFloat(param1:Number) : void;
      
      function writeDouble(param1:Number) : void;
      
      function writeMultiByte(param1:String, param2:String) : void;
      
      function writeUTF(param1:String) : void;
      
      function writeUTFBytes(param1:String) : void;
      
      function writeObject(param1:*) : void;
      
      function get objectEncoding() : uint;
      
      function set objectEncoding(param1:uint) : void;
      
      function get endian() : String;
      
      function set endian(param1:String) : void;
   }
}

