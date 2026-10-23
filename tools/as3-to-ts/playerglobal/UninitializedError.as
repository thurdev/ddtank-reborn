package
{
   [native(cls="UninitializedErrorClass",gc="exact",instance="UninitializedErrorObject",methods="auto")]
   public dynamic class UninitializedError extends Error
   {
      
      public static const length:int = 1;
      
      prototype.name = "UninitializedError";
      
      public function UninitializedError(message:* = "", id:* = 0)
      {
         super(message,id);
         this.name = prototype.name;
      }
   }
}

