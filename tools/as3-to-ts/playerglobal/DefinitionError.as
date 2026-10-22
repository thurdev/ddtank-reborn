package
{
   [native(cls="DefinitionErrorClass",gc="exact",instance="DefinitionErrorObject",methods="auto")]
   public dynamic class DefinitionError extends Error
   {
      
      public static const length:int = 1;
      
      prototype.name = "DefinitionError";
      
      public function DefinitionError(message:* = "", id:* = 0)
      {
         super(message,id);
         this.name = prototype.name;
      }
   }
}

