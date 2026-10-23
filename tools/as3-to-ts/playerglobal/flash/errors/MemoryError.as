package flash.errors
{
   public dynamic class MemoryError extends Error
   {
      
      public function MemoryError(message:String = "", id:int = 0)
      {
         super(message,id);
      }
   }
}

