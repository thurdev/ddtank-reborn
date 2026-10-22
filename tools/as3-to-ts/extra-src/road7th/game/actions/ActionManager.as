package road7th.game.actions
{
   import flash.utils.getQualifiedClassName;
   
   public class ActionManager
   {
      
      private var _queue:Array;
      
      public function ActionManager()
      {
         super();
         this._queue = new Array();
      }
      
      public function act(action:BaseAction) : void
      {
         var c:* = null;
         for(var i:int = 0; i < this._queue.length; i++)
         {
            c = this._queue[i];
            if(Boolean(c.connect(action)))
            {
               return;
            }
            if(Boolean(c.canReplace(action)))
            {
               action.prepare();
               this._queue[i] = action;
               return;
            }
         }
         this._queue.push(action);
         if(this._queue.length == 1)
         {
            action.prepare();
         }
      }
      
      public function execute() : void
      {
         var c:* = null;
         if(this._queue.length > 0)
         {
            c = this._queue[0];
            if(!c.isFinished)
            {
               c.execute();
            }
            else
            {
               this._queue.shift();
               if(this._queue.length > 0)
               {
                  this._queue[0].prepare();
               }
            }
         }
      }
      
      public function traceAllRemainAction() : void
      {
         var action:* = null;
         var actionClassName:* = null;
         for each(action in this._queue)
         {
            actionClassName = getQualifiedClassName(action);
         }
      }
      
      public function get actionCount() : int
      {
         return this._queue.length;
      }
      
      public function executeAtOnce() : void
      {
         var action:* = null;
         for each(action in this._queue)
         {
            action.executeAtOnce();
         }
      }
      
      public function clear() : void
      {
         var action:* = null;
         for each(action in this._queue)
         {
            action.cancel();
         }
         this._queue = [];
      }
   }
}

