package flash.utils
{
   public interface IExternalizable
   {
      
      function writeExternal(param1:IDataOutput) : void;
      
      function readExternal(param1:IDataInput) : void;
   }
}

