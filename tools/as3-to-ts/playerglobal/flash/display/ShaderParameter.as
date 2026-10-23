package flash.display
{
   [native(cls="ShaderParameterClass",instance="ShaderParameterObject",methods="auto")]
   [Version("10")]
   public final dynamic class ShaderParameter
   {
      
      public function ShaderParameter()
      {
         super();
      }
      
      public native function get value() : Array;
      
      public native function set value(param1:Array) : void;
      
      public native function get type() : String;
      
      public native function get index() : int;
   }
}

