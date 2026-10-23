package flash.display
{
   import flash.events.EventDispatcher;
   
   [native(cls="ShaderJobClass",instance="ShaderJobObject",methods="auto")]
   [Version("10")]
   [Event(name="complete",type="flash.events.ShaderEvent")]
   public class ShaderJob extends EventDispatcher
   {
      
      public function ShaderJob(shader:Shader = null, target:Object = null, width:int = 0, height:int = 0)
      {
         super();
         if(Boolean(shader))
         {
            this.shader = shader;
         }
         if(Boolean(target))
         {
            this.target = target;
         }
         this.width = width;
         this.height = height;
      }
      
      public native function start(param1:Boolean = false) : void;
      
      public native function cancel() : void;
      
      public native function get shader() : Shader;
      
      public native function set shader(param1:Shader) : void;
      
      public native function get target() : Object;
      
      public native function set target(param1:Object) : void;
      
      public native function get width() : int;
      
      public native function set width(param1:int) : void;
      
      public native function get height() : int;
      
      public native function set height(param1:int) : void;
      
      public native function get progress() : Number;
   }
}

