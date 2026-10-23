package
{
   [native(cls="ReferenceErrorClass",gc="exact",instance="ReferenceErrorObject",methods="auto")]
   public dynamic class ReferenceError extends Error
   {
      
      public static const length:int = 1;
      
      prototype.name = "ReferenceError";
      
      public function ReferenceError(message:* = "", id:* = 0)
      {
         super(message,id);
         this.name = prototype.name;
      }
   }
}

