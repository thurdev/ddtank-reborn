package flash.utils
{
   public interface IDataInput
   {
      
      [cppcall]
      function readBytes(param1:ByteArray, param2:uint = 0, param3:uint = 0) : void;
      
      [cppcall]
      function readBoolean() : Boolean;
      
      [cppcall]
      function readByte() : int;
      
      [cppcall]
      function readUnsignedByte() : uint;
      
      [cppcall]
      function readShort() : int;
      
      [cppcall]
      function readUnsignedShort() : uint;
      
      [cppcall]
      function readInt() : int;
      
      [cppcall]
      function readUnsignedInt() : uint;
      
      [cppcall]
      function readFloat() : Number;
      
      [cppcall]
      function readDouble() : Number;
      
      [cppcall]
      function readMultiByte(param1:uint, param2:String) : String;
      
      [cppcall]
      function readUTF() : String;
      
      [cppcall]
      function readUTFBytes(param1:uint) : String;
      
      [cppcall]
      function get bytesAvailable() : uint;
      
      [cppcall]
      function readObject() : *;
      
      [cppcall]
      function get objectEncoding() : uint;
      
      [cppcall]
      function set objectEncoding(param1:uint) : void;
      
      [cppcall]
      function get endian() : String;
      
      [cppcall]
      function set endian(param1:String) : void;
   }
}

