package road7th.game.actions
{
   import flash.utils.clearTimeout;
   import road7th.game.object.GameLiving;
   
   public class LivingMoveAction extends BaseAction
   {
      
      private var _living:GameLiving;
      
      private var _path:Array;
      
      private var _dir:int;
      
      private var _currentPathIndex:int = 0;
      
      private var _endAction:String;
      
      private var _delayForShootBool:Boolean;
      
      private var _endFunc:Function;
      
      private var _timeOutID:int;
      
      public function LivingMoveAction(living:GameLiving, path:Array, dir:int, endAction:String = "", endFunc:Function = null)
      {
         super();
         this._living = living;
         this._path = path;
         this._dir = dir;
         this._endAction = endAction;
         this._endFunc = endFunc;
      }
      
      override public function prepare() : void
      {
         if(this._living.isLiving)
         {
            this._living.startMoving();
            if(this._path[0].x < this._path[this._path.length - 1].x)
            {
               this._living.movie.scaleX = -1;
            }
            else if(this._path[0].x > this._path[this._path.length - 1].x)
            {
               this._living.movie.scaleX = 1;
            }
         }
         else
         {
            this.finish();
         }
      }
      
      override public function execute() : void
      {
         var pos:* = null;
         if(this._delayForShootBool)
         {
            return;
         }
         if(Boolean(this._path[this._currentPathIndex]))
         {
            pos = this._path[this._currentPathIndex];
            this._living.info.pos = pos;
         }
         ++this._currentPathIndex;
         if(this._currentPathIndex >= this._path.length)
         {
            if(this._endAction != "")
            {
               this._living.doAction(this._endAction);
            }
            else
            {
               this._living.info.doDefaultAction();
            }
            this.finish();
         }
      }
      
      private function finish() : void
      {
         this._living.stopMoving();
         _isFinished = true;
         this._living = null;
         if(this._endFunc != null)
         {
            this._endFunc();
         }
      }
      
      private function delayForShoot() : void
      {
         if(Boolean(this._living) && Boolean(this._living.info))
         {
            this._living.info.shoot(null);
         }
         _isFinished = true;
         this._living = null;
         if(Boolean(this._timeOutID))
         {
            clearTimeout(this._timeOutID);
         }
      }
   }
}

