package flash.errors
{
   public dynamic class ScriptTimeoutError extends Error
   {
      
      public function ScriptTimeoutError(message:String = "", id:int = 0)
      {
         super(message,id);
      }
   }
}

