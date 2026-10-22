package flash.display
{
   [native(cls="ShaderInputClass",instance="ShaderInputObject",methods="auto")]
   [Version("10")]
   public final dynamic class ShaderInput
   {
      
      public function ShaderInput()
      {
         super();
      }
      
      public native function get input() : Object;
      
      public native function set input(param1:Object) : void;
      
      public native function get width() : int;
      
      public native function set width(param1:int) : void;
      
      public native function get height() : int;
      
      public native function set height(param1:int) : void;
      
      public native function get channels() : int;
      
      public native function get index() : int;
   }
}

