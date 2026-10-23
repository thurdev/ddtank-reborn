package
{
   [native(cls="SecurityErrorClass",gc="exact",instance="SecurityErrorObject",methods="auto")]
   public dynamic class SecurityError extends Error
   {
      
      public static const length:int = 1;
      
      prototype.name = "SecurityError";
      
      public function SecurityError(message:* = "", id:* = 0)
      {
         super(message,id);
         this.name = prototype.name;
      }
   }
}

