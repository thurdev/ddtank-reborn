package road7th.game.actions
{
   import road7th.game.model.Bomb;
   import road7th.game.object.GameCharacter;
   import road7th.game.object.GameLocalPlayer;
   import road7th.game.object.SimpleBomb;
   import road7th.manager.SoundManager;
   
   public class ShootBombAction extends BaseAction
   {
      
      private var _player:GameLocalPlayer;
      
      private var _showAction:PlayerAction;
      
      private var _hideAction:PlayerAction;
      
      private var _bombs:Vector.<Bomb>;
      
      private var _isShoot:Boolean;
      
      private var _shootInterval:int;
      
      public function ShootBombAction(player:GameLocalPlayer, bombs:Vector.<Bomb>, interval:int = 8000)
      {
         super();
         this._player = player;
         this._bombs = bombs;
         this._shootInterval = interval;
      }
      
      override public function prepare() : void
      {
         if(_isPrepare)
         {
            return;
         }
         _isPrepare = true;
         if(this._player == null || this._player.body == null || this._player.localPlayer == null)
         {
            this.finish();
            return;
         }
         this._showAction = GameCharacter.THROWS;
         this._hideAction = GameCharacter.HIDETHROWS;
         if(this._player.isLiving)
         {
            this._player.body.doAction(this._showAction);
            if(Boolean(this._player.weaponMovie))
            {
               this._player.weaponMovie.visible = true;
               this._player.setWeaponMoiveActionSyc("shot");
            }
         }
      }
      
      override public function execute() : void
      {
         if(this._player == null || this._player.body == null || this._player.body.currentAction == null)
         {
            this.finish();
            return;
         }
         if(this._player.body.currentAction != this._showAction)
         {
            if(Boolean(this._player.weaponMovie))
            {
               this._player.weaponMovie.visible = false;
            }
         }
         if(!this._isShoot)
         {
            if(!this._player.body.actionPlaying() || this._player.body.currentAction != this._showAction)
            {
               this.executeImp(false);
            }
         }
         else
         {
            --this._shootInterval;
            if(this._shootInterval <= 0)
            {
               if(this._player.body.currentAction == this._showAction)
               {
                  if(this._player.isLiving)
                  {
                     this._player.body.doAction(this._hideAction);
                  }
                  if(Boolean(this._player.weaponMovie))
                  {
                     this._player.setWeaponMoiveActionSyc("end");
                  }
               }
               this.finish();
            }
         }
      }
      
      private function setSelfShootFinish() : void
      {
         if(!this._player.isExist)
         {
            return;
         }
         if(!this._player.info.isSelf)
         {
            return;
         }
         if(this._player.localPlayer.shootOverCount > this._player.localPlayer.shootCount)
         {
            this._player.localPlayer.shootOverCount = this._player.localPlayer.shootCount;
         }
         else if(this._player.localPlayer.shootOverCount == this._player.localPlayer.shootCount)
         {
            this._player.localPlayer.shootOverCount = this._player.localPlayer.shootCount;
            this._player.localPlayer.shooting = false;
         }
         else
         {
            ++this._player.localPlayer.shootOverCount;
         }
      }
      
      private function finish() : void
      {
         _isFinished = true;
         this.setSelfShootFinish();
      }
      
      private function executeImp(fastModel:Boolean) : void
      {
         var bombPt:* = null;
         var bombInfo:* = null;
         var bomb:* = null;
         if(!this._isShoot)
         {
            this._isShoot = true;
            this._player.localPlayer.shooting = true;
            SoundManager.instance.play(Bomb(this._bombs[0]).Template.ShootSound);
            for each(bombInfo in this._bombs)
            {
               bombPt = this._player.shootPoint();
               bombInfo.X = bombPt.x;
               bombInfo.Y = bombPt.y;
               bomb = new SimpleBomb(bombInfo,this._player.info);
               this._player.map.addPhysical(bomb);
               bomb.startMoving();
            }
         }
      }
      
      override public function executeAtOnce() : void
      {
         super.executeAtOnce();
         this.executeImp(true);
      }
   }
}

