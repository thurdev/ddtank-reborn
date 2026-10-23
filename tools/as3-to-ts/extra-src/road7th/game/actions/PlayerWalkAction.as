package road7th.game.actions
{
   import flash.geom.Point;
   import road7th.game.animations.AnimationLevel;
   import road7th.game.model.LocalPlayer;
   import road7th.game.object.GameCharacter;
   import road7th.game.object.GameLiving;
   import road7th.manager.GameManager;
   
   public class PlayerWalkAction extends BaseAction
   {
      
      private var _living:GameLiving;
      
      private var _action:*;
      
      private var _target:Point;
      
      private var _dir:Number;
      
      private var _self:LocalPlayer;
      
      public function PlayerWalkAction(living:GameLiving, target:Point, dir:Number, action:* = null)
      {
         super();
         _isFinished = false;
         this._self = GameManager.Instance.Current.selfGamePlayer;
         this._living = living;
         this._action = Boolean(action) ? action : GameCharacter.WALK;
         this._target = target;
         this._dir = dir;
      }
      
      override public function connect(action:BaseAction) : Boolean
      {
         var walk:PlayerWalkAction = action as PlayerWalkAction;
         if(Boolean(walk))
         {
            this._target = walk._target;
            this._dir = walk._dir;
            return true;
         }
         return false;
      }
      
      override public function prepare() : void
      {
         if(_isPrepare)
         {
            return;
         }
         _isPrepare = true;
         if(this._living.isLiving)
         {
            this._living.startMoving();
         }
         else
         {
            this.finish();
         }
      }
      
      override public function execute() : void
      {
         var p:* = null;
         if(Point.distance(this._living.pos,this._target) <= this._living.stepX || this._target.x == this._living.x)
         {
            this.finish();
         }
         else
         {
            this._living.info.direction = this._target.x > this._living.x ? 1 : int(-1);
            p = this._living.getNextWalkPoint(this._living.info.direction);
            if(p == null || this._living.info.direction > 0 && p.x >= this._target.x || this._living.info.direction < 0 && p.x <= this._target.x)
            {
               this.finish();
            }
            else
            {
               this._living.info.pos = p;
               this._living.doAction(this._action);
               if(!this._living.info.isHidden)
               {
                  this._living.needFocus(0,0,{
                     "strategy":"directly",
                     "priority":AnimationLevel.MIDDLE
                  });
               }
            }
         }
      }
      
      private function finish() : void
      {
         this._living.info.pos = this._target;
         this._living.info.direction = this._dir;
         this._living.stopMoving();
         _isFinished = true;
      }
      
      override public function executeAtOnce() : void
      {
         super.executeAtOnce();
         this._living.info.pos = this._target;
         this._living.info.direction = this._dir;
         this._living.stopMoving();
      }
   }
}

