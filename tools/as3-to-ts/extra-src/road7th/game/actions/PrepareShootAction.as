package road7th.game.actions
{
   import road7th.game.object.GameCharacter;
   import road7th.game.object.GameLocalPlayer;
   import road7th.manager.BallManager;
   
   public class PrepareShootAction extends BaseAction
   {
      
      public static var hasDoSkillAnimation:Boolean;
      
      private var _player:GameLocalPlayer;
      
      private var _actionType:PlayerAction;
      
      public function PrepareShootAction(player:GameLocalPlayer)
      {
         super();
         this._player = player;
      }
      
      override public function connect(action:BaseAction) : Boolean
      {
         return action is PrepareShootAction;
      }
      
      override public function prepare() : void
      {
         if(this._player.isLiving)
         {
            this._actionType = GameCharacter.SHOWGUN;
            if((this._player.localPlayer.skill >= 0 || this._player.localPlayer.isSpecialSkill) && !hasDoSkillAnimation)
            {
               hasDoSkillAnimation = true;
               this._player.map.spellKill(this._player);
            }
            this._player.weaponMovie = BallManager.createShootMovieMovie(this._player.localPlayer.currentBomb);
            this._player.body.doAction(this._actionType);
            if(Boolean(this._player.weaponMovie))
            {
               this._player.weaponMovie.visible = true;
               this._player.setWeaponMoiveActionSyc("start");
            }
         }
         else
         {
            _isFinished = true;
         }
      }
      
      override public function execute() : void
      {
         if(this._player == null || this._player.body == null || this._player.body.currentAction == null)
         {
            _isFinished = true;
            return;
         }
         if(this._player.body.currentAction != this._actionType)
         {
            if(Boolean(this._player.weaponMovie))
            {
               this._player.weaponMovie.visible = false;
            }
         }
         if(!this._player.body.actionPlaying() || this._player.body.currentAction != this._actionType)
         {
            this._player.localPlayer.isShootPrepared = true;
            _isFinished = true;
         }
      }
   }
}

