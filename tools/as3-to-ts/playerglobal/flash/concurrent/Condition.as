package flash.concurrent
{
   [native(cls="ConditionClass",instance="ConditionObject",gc="exact")]
   [API("684")]
   public final class Condition
   {
      
      public function Condition(mutex:Mutex)
      {
         super();
         this.ctor(mutex);
      }
      
      public static native function get isSupported() : Boolean;
      
      public native function get mutex() : Mutex;
      
      public native function wait(param1:Number = -1) : Boolean;
      
      public native function notify() : void;
      
      public native function notifyAll() : void;
      
      private native function ctor(param1:Mutex) : void;
   }
}

