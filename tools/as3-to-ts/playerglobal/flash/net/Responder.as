package flash.net
{
   [native(cls="ResponderClass",instance="ResponderObject",methods="auto")]
   public class Responder
   {
      
      public function Responder(result:Function, status:Function = null)
      {
         super();
         this.ctor(result,status);
      }
      
      private native function ctor(param1:Function, param2:Function) : void;
   }
}

