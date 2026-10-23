package avmplus
{
   use namespace AS3;
   
   function describeMetadata(x:XML, metadata:Array) : void
   {
      var md:* = undefined;
      var m:XML = null;
      var i:* = undefined;
      var a:XML = null;
      var c:XMLList = x.*;
      for each(md in metadata)
      {
         m = metadataXml.copy();
         m.@name = md.name;
         for each(i in md.value)
         {
            a = argXml.copy();
            a.@key = i.key;
            a.@value = i.value;
            m.appendChild(a);
         }
         c[c.length()] = m;
      }
   }
}

