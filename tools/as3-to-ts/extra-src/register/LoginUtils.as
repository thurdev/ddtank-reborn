package register
{
   import com.hurlant.crypto.rsa.RSAKey;
   import com.hurlant.math.BigInteger;
   import com.hurlant.util.Base64;
   import com.pickgliss.utils.MD5;
   import flash.net.URLVariables;
   import flash.utils.ByteArray;
   
   public class LoginUtils
   {
      
      private static const m1:String = "zRSdzFcnZjOCxDMkWUbuRgiOZIQlk7frZMhElQ0a7VqZI9VgU3+lwo0ghZLU3Gg63kOY2UyJ5vFpQdwJUQydsF337ZAUJz4rwGRt/MNL70wm71nGfmdPv4ING+DyJ3ZxFawwE1zSMjMOqQtY4IV8his/HlgXuUfIHVDK87nMNLc=";
      
      private static const m2:String = "AQAB";
      
      public function LoginUtils()
      {
         super();
      }
      
      public static function generateRsaLoginKey() : RSAKey
      {
         return generateRsaKey(m1,m2);
      }
      
      public static function generateRsaKey(m:String, e:String) : RSAKey
      {
         return generateRsaKey2(Base64.decodeToByteArray(m),Base64.decodeToByteArray(e));
      }
      
      public static function generateRsaKey2(m:ByteArray, e:ByteArray) : RSAKey
      {
         var mi:BigInteger = new BigInteger(m);
         var ei:BigInteger = new BigInteger(e);
         return new RSAKey(mi,ei.intValue());
      }
      
      public static function rsaEncry4(rsa:RSAKey, src:ByteArray) : String
      {
         var dData:ByteArray = new ByteArray();
         rsa.encrypt(src,dData,src.length);
         return Base64.encodeByteArray(dData);
      }
      
      public static function creatWidthKey(mustNew:Boolean) : URLVariables
      {
         var data:URLVariables = new URLVariables();
         data["key"] = MD5.hash(RegisterState.pass);
         data["rnd"] = Math.random();
         return data;
      }
   }
}

