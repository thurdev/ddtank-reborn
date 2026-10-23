package
{
   [native(cls="RangeErrorClass",gc="exact",instance="RangeErrorObject",methods="auto")]
   public dynamic class RangeError extends Error
   {
      
      public static const length:int = 1;
      
      prototype.name = "RangeError";
      
      public function RangeError(message:* = "", id:* = 0)
      {
         super(message,id);
         this.name = prototype.name;
      }
   }
}

