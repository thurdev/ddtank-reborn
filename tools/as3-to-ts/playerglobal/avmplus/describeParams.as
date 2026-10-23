package avmplus
{
   use namespace AS3;
   
   function describeParams(x:XML, parameters:Object) : void
   {
      var i:* = undefined;
      var p:* = undefined;
      var f:XML = null;
      var c:XMLList = x.*;
      for(i in parameters)
      {
         p = parameters[i];
         f = parameterXml.copy();
         f.@index = i + 1;
         f.@type = p.type;
         f.@optional = p.optional;
         c[c.length()] = f;
      }
   }
}

