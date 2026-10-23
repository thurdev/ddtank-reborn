package flash.display
{
   import flash.utils.ByteArray;
   
   [native(cls="ShaderDataClass",instance="ShaderDataObject",methods="auto")]
   [Version("10")]
   public final dynamic class ShaderData
   {
      
      public function ShaderData(byteCode:ByteArray)
      {
         super();
         this._setByteCode(byteCode);
      }
      
      private native function _setByteCode(param1:ByteArray) : void;
   }
}

