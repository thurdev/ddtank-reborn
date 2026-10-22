package
{
   [native(cls="SyntaxErrorClass",gc="exact",instance="SyntaxErrorObject",methods="auto")]
   public dynamic class SyntaxError extends Error
   {
      
      public static const length:int = 1;
      
      prototype.name = "SyntaxError";
      
      public function SyntaxError(message:* = "", id:* = 0)
      {
         super(message,id);
         this.name = prototype.name;
      }
   }
}

