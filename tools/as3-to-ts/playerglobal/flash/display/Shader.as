package flash.display
{
   import flash.utils.ByteArray;
   
   [native(cls="ShaderClass",instance="ShaderObject",methods="auto")]
   [Version("10")]
   public class Shader
   {
      
      public function Shader(code:ByteArray = null)
      {
         super();
         if(Boolean(code))
         {
            this.byteCode = code;
         }
      }
      
      public function set byteCode(code:ByteArray) : void
      {
         this.data = new ShaderData(code);
      }
      
      public native function get data() : ShaderData;
      
      public native function set data(param1:ShaderData) : void;
      
      public native function get precisionHint() : String;
      
      public native function set precisionHint(param1:String) : void;
   }
}

