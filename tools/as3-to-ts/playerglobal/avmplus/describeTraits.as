package avmplus
{
   use namespace AS3;
   
   function describeTraits(x:XML, traits:Object) : void
   {
      var i:* = undefined;
      var base:String = null;
      var e:XML = null;
      var interf:String = null;
      var variable:Object = null;
      var accessor:Object = null;
      var method:Object = null;
      var c:XMLList = x.*;
      for each(i in traits.bases)
      {
         base = i;
         e = extendsXml.copy();
         e.@type = base;
         c[c.length()] = e;
      }
      for each(i in traits.interfaces)
      {
         interf = i;
         e = implementsXml.copy();
         e.@type = interf;
         c[c.length()] = e;
      }
      if(traits.constructor !== null)
      {
         e = constructorXml.copy();
         describeParams(e,traits.constructor);
         c[c.length()] = e;
      }
      for each(i in traits.variables)
      {
         variable = i;
         e = variable.access == "readonly" ? constantXml.copy() : variableXml.copy();
         e.@name = variable.name;
         e.@type = variable.type;
         finish(e,variable);
         c[c.length()] = e;
      }
      for each(i in traits.accessors)
      {
         accessor = i;
         e = accessorXml.copy();
         e.@name = accessor.name;
         e.@access = accessor.access;
         e.@type = accessor.type;
         e.@declaredBy = accessor.declaredBy;
         finish(e,accessor);
         c[c.length()] = e;
      }
      for each(i in traits.methods)
      {
         method = i;
         e = methodXml.copy();
         e.@name = method.name;
         e.@declaredBy = method.declaredBy;
         e.@returnType = method.returnType;
         describeParams(e,method.parameters);
         finish(e,method);
         c[c.length()] = e;
      }
      describeMetadata(x,traits.metadata);
   }
}

