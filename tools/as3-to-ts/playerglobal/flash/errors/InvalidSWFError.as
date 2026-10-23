package flash.errors
{
   public dynamic class InvalidSWFError extends Error
   {
      
      public function InvalidSWFError(message:String = "", id:int = 0)
      {
         super(message,id);
      }
   }
}

