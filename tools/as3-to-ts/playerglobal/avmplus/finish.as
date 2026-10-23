package avmplus
{
   use namespace AS3;
   
   function finish(e:XML, i:Object) : void
   {
      if(i.uri !== null)
      {
         e.@uri = i.uri;
      }
      if(i.metadata !== null)
      {
         describeMetadata(e,i.metadata);
      }
   }
}

