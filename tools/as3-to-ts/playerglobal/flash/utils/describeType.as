package flash.utils
{
   import avmplus.*;
   import flash.display.*;
   import flash.events.*;
   import flash.system.*;
   
   public function describeType(value:*) : XML
   {
      var x:XML = avmplus.describeType(value,FLASH10_FLAGS);
      var alias:String = getAliasName(value);
      if(alias != null)
      {
         x.@alias = alias;
      }
      return x;
   }
}

