package flash.events
{
   import flash.net.drm.*;
   
   [native(friend="DRMVoucherObject")]
   [API("661")]
   internal class DRMCustomProperties
   {
      
      public function DRMCustomProperties()
      {
         super();
      }
      
      [cppcall]
      private static function createObj() : Object
      {
         return new Object();
      }
      
      [cppcall]
      private static function setCustomProp(obj:Object, key:String, value:String) : void
      {
         obj[key] = value;
      }
      
      [cppcall]
      private static function setCustomProp15(obj:Object, key:String, value:String) : void
      {
         obj[unescape(key.replace(/\+/g," "))] = unescape(value.replace(/\+/g," "));
      }
   }
}

