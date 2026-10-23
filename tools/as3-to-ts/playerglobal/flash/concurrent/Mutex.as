package flash.concurrent
{
   [native(cls="MutexClass",instance="MutexObject",gc="exact")]
   [API("684")]
   public final class Mutex
   {
      
      public function Mutex()
      {
         super();
         this.ctor();
      }
      
      public static native function get isSupported() : Boolean;
      
      public native function lock() : void;
      
      public native function tryLock() : Boolean;
      
      public native function unlock() : void;
      
      private native function ctor() : void;
   }
}

