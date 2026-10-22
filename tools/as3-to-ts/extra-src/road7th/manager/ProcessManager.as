package road7th.manager
{
   import flash.events.Event;
   import flash.utils.getTimer;
   import road7th.core.Global;
   import road7th.interfaces.IProcessObject;
   
   public class ProcessManager
   {
      
      private static var _ins:ProcessManager;
      
      private var _queue:Vector.<IProcessObject> = new Vector.<IProcessObject>();
      
      private var _startup:Boolean = false;
      
      private var _elapsed:int;
      
      public function ProcessManager()
      {
         super();
      }
      
      public static function get Instance() : ProcessManager
      {
         if(_ins == null)
         {
            _ins = new ProcessManager();
         }
         return _ins;
      }
      
      public function addObject(obj:IProcessObject) : void
      {
         if(!obj.onProcess)
         {
            obj.onProcess = true;
            this._queue.push(obj);
            this.startup();
         }
      }
      
      public function removeObject(obj:IProcessObject) : void
      {
         var idx:int = 0;
         if(obj.onProcess)
         {
            idx = this._queue.indexOf(obj);
            if(idx >= 0)
            {
               this._queue.splice(idx,1);
            }
            obj.onProcess = false;
            if(this._queue.length <= 0)
            {
               this.shutdown();
            }
         }
      }
      
      public function startup() : void
      {
         if(!this._startup)
         {
            Global.mainStage.addEventListener(Event.ENTER_FRAME,this.__onFrame);
            this._elapsed = getTimer();
            this._startup = true;
         }
      }
      
      private function __onFrame(event:Event) : void
      {
         var obj:* = null;
         var now:int = getTimer();
         var rate:int = now - this._elapsed;
         for each(obj in this._queue)
         {
            obj.process(rate);
         }
         this._elapsed = now;
      }
      
      public function shutdown() : void
      {
         if(this._startup)
         {
            Global.mainStage.removeEventListener(Event.ENTER_FRAME,this.__onFrame);
            this._startup = false;
         }
      }
   }
}

