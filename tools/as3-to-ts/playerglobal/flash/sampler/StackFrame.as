package flash.sampler
{
   public final class StackFrame
   {
      
      public const name:String;
      
      public const file:String;
      
      public const line:uint;
      
      public const scriptID:Number;
      
      public function StackFrame()
      {
         super();
      }
      
      public function toString() : String
      {
         return this.name + "()" + (Boolean(this.file) ? "[" + this.file + ":" + this.line + "]" : "");
      }
   }
}

