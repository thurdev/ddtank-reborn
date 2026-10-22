package flash.system
{
   import flash.utils.ByteArray;
   
   [native(cls="WorkerDomainClass",instance="WorkerDomainObject",methods="auto",construct="native")]
   [API("680")]
   public final class WorkerDomain
   {
      
      private static var _current:WorkerDomain;
      
      public function WorkerDomain()
      {
         super();
      }
      
      public static native function get isSupported() : Boolean;
      
      public static function get current() : WorkerDomain
      {
         return _current;
      }
      
      public native function createWorker(param1:ByteArray, param2:Boolean = false) : Worker;
      
      public native function listWorkers() : Vector.<Worker>;
   }
}

