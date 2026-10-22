package road7th.game.actions
{
   import flash.geom.Point;
   import flash.ui.Keyboard;
   import org.aswing.KeyStroke;
   import org.aswing.KeyboardManager;
   import road7th.game.animations.AnimationLevel;
   import road7th.game.object.GameLiving;
   import road7th.game.object.GameLocalPlayer;
   import road7th.game.view.prompt.PromptManager;
   import road7th.manager.GameManager;
   
   public class SelfPlayerWalkAction extends BaseAction
   {
      
      private var _player:GameLocalPlayer;
      
      private var _end:Point;
      
      private var _count:int;
      
      public function SelfPlayerWalkAction(player:GameLocalPlayer)
      {
         super();
         this._player = player;
         this._count = 0;
         _isFinished = false;
      }
      
      override public function connect(action:BaseAction) : Boolean
      {
         return action is SelfPlayerWalkAction;
      }
      
      private function isDirkeyDown() : Boolean
      {
         if(this._player.info.direction == -1)
         {
            return KeyboardManager.isDown(KeyStroke.VK_A.getCode()) || KeyboardManager.isDown(Keyboard.LEFT);
         }
         return KeyboardManager.isDown(KeyStroke.VK_D.getCode()) || KeyboardManager.isDown(Keyboard.RIGHT);
      }
      
      override public function prepare() : void
      {
         this._player.startMoving();
         this._player.needFocus(0,0,{
            "strategy":"directly",
            "priority":AnimationLevel.MIDDLE
         });
      }
      
      override public function execute() : void
      {
         var pos:* = null;
         var tx:Number = NaN;
         if(this.isDirkeyDown() && (this._player.localPlayer.powerRatio == 0 || this._player.localPlayer.energy > 0) && this._player.localPlayer.isAttacking)
         {
            pos = this._player.getNextWalkPoint(this._player.info.direction);
            if(Boolean(pos))
            {
               this._player.info.pos = pos;
               this._player.body.doAction(this._player.body.walkAction);
               this._player.needFocus(0,0,{
                  "strategy":"directly",
                  "priority":AnimationLevel.MIDDLE
               });
               ++this._count;
               if(this._count >= 20)
               {
                  this.sendAction();
               }
            }
            else
            {
               this.sendAction();
               this.finish();
               tx = this._player.x + this._player.info.direction * GameManager.MOVE_SPEED;
               if(this._player.canMoveDirection(this._player.info.direction) && this._player.canStand(tx,this._player.y) == false)
               {
                  pos = this._player.map.findYLineNotEmptyPointDown(tx,this._player.y - GameLiving.stepY,this._player.map.bound.height);
                  if(Boolean(pos))
                  {
                     this._player.act(new PlayerFallingAction(this._player,pos,true,false));
                  }
                  else
                  {
                     this._player.act(new PlayerFallingAction(this._player,new Point(tx,this._player.map.bound.height - 70),false,false));
                  }
               }
            }
         }
         else
         {
            if(this._player.localPlayer.energy <= 0)
            {
               PromptManager.Instance.show(PromptManager.Instance.SHOW_POWER_NOTENOGH);
            }
            this.sendAction();
            this.finish();
         }
      }
      
      private function sendAction() : void
      {
         this._count = 0;
      }
      
      private function finish() : void
      {
         this._player.stopMoving();
         _isFinished = true;
      }
   }
}

