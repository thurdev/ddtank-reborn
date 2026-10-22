package flash.crypto
{
   import flash.utils.ByteArray;
   
   [API("674")]
   [native("FlashCryptoScript::generateRandomBytes")]
   public native function generateRandomBytes(param1:uint) : ByteArray;
}

