package road7th.game.object
{
   import com.pickgliss.utils.ObjectUtils;
   import flash.display.Bitmap;
   import flash.display.BitmapData;
   import flash.display.DisplayObject;
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.events.KeyboardEvent;
   import flash.geom.Matrix;
   import flash.geom.Point;
   import flash.utils.getTimer;
   import road7th.core.Global;
   import road7th.events.GameKeyEvent;
   import road7th.events.LivingEvent;
   import road7th.game.actions.PrepareShootAction;
   import road7th.game.actions.SelfPlayerWalkAction;
   import road7th.game.actions.ShootBombAction;
   import road7th.game.left.LeftPlayerCartoonView;
   import road7th.game.model.LocalPlayer;
   import road7th.game.view.living.EnergyBar;
   import road7th.game.view.smallMap.SmallPlayer;
   import road7th.manager.KeyManager;
   import road7th.manager.StepManager;
   import road7th.utils.ClassUtils;
   
   public class GameLocalPlayer extends GameLiving
   {
      
      private static const MAX_MOVE_TIME:int = 10;
      
      private var _body:GameCharacter;
      
      private var _self:LocalPlayer;
      
      private var _ballpos:Point = new Point(30,40);
      
      private var _lvIcon:DisplayObject;
      
      private var _energyBar:EnergyBar;
      
      protected var _player:Sprite;
      
      private var _takeAim:MovieClip;
      
      protected var _isShooting:Boolean = false;
      
      private var _currentWeaponMovieAction:String = "";
      
      private var _currentWeaponMovie:MovieClip;
      
      private var _weaponMovie:MovieClip;
      
      private var _keyDownTime:int;
      
      public function GameLocalPlayer(self:LocalPlayer)
      {
         this._self = self;
         super(self);
      }
      
      public function get aim() : MovieClip
      {
         return this._takeAim;
      }
      
      public function get localPlayer() : LocalPlayer
      {
         return this._self;
      }
      
      public function get body() : GameCharacter
      {
         return this._body;
      }
      
      override protected function creatBody() : void
      {
         this._player = new Sprite();
         this._player.y = -3;
         addChild(this._player);
         this._body = new GameCharacter(Global.selfCharacterData);
         this._player.addChild(this._body);
         this._body.doAction(GameCharacter.STAND);
         var shot:BitmapData = new BitmapData(LeftPlayerCartoonView.CartoonWidth,LeftPlayerCartoonView.CartoonHeight,true,0);
         var src:BitmapData = ClassUtils.CreatInstance("asset.game.cartoon." + _info.playerInfo.sex);
         var mat:Matrix = new Matrix(-LeftPlayerCartoonView.CartoonWidth / src.width,0,0,LeftPlayerCartoonView.CartoonHeight / src.height,LeftPlayerCartoonView.CartoonWidth);
         shot.draw(src,mat,null,null,null,true);
         ObjectUtils.disposeObject(src);
         _info.shot = shot;
      }
      
      override protected function creatSmallView() : void
      {
         _smallView = new SmallPlayer();
         _smallView.pos.x = _info.pos.x;
         _smallView.pos.y = _info.pos.y;
         _smallView.info = _info;
      }
      
      override protected function configUI() : void
      {
         super.configUI();
         this._energyBar = new EnergyBar();
         this._energyBar.x = _healthBar.x + 22;
         this._energyBar.y = _nicknameField.y + _nicknameField.height + 4;
         addChild(this._energyBar);
         this._lvIcon = new Bitmap(ClassUtils.CreatInstance("asset.LevelIcon.Level_1"),"auto",true);
         this._lvIcon.scaleY = 0.7;
         this._lvIcon.scaleX = 0.7;
         this._lvIcon.x = _healthBar.x - this._lvIcon.width - 2;
         this._lvIcon.y = _healthBar.y;
         addChild(this._lvIcon);
      }
      
      override protected function creatArm() : void
      {
         this._takeAim = ClassUtils.CreatInstance("asset.game.TakeAimAsset");
         this._takeAim.x = 35;
         this._takeAim.y = -10;
         this._takeAim.scaleX = -1;
         this._takeAim["hand"].rotation = this.localPlayer.currentWeapInfo.armMinAngle;
         this._takeAim.mouseEnabled = false;
         this._takeAim.mouseChildren = false;
         this._player.addChild(this._takeAim);
      }
      
      override protected function __attackChanged(event:LivingEvent) : void
      {
         super.__attackChanged(event);
         if(Boolean(this._takeAim))
         {
            this._takeAim.visible = _info.isAttacking;
         }
         if(this.localPlayer.isAttacking && this.localPlayer.isLiving)
         {
            act(new SelfPlayerWalkAction(this));
         }
      }
      
      override protected function __directionChanged(event:LivingEvent) : void
      {
         this._player.scaleX = _info.direction;
      }
      
      override protected function addEvent() : void
      {
         super.addEvent();
         this._self.addEventListener(LivingEvent.SendShootAction,this.__sendShoot);
         this._self.addEventListener(LivingEvent.Dress,this.__dress);
         this._self.addEventListener(LivingEvent.EnergyChanged,this.__energyChanged);
         KeyManager.Instance.addEventListener(GameKeyEvent.KEY_DOWN,this._keyDown);
         KeyManager.Instance.addEventListener(GameKeyEvent.KEY_UP,this._keyUp);
      }
      
      private function __energyChanged(event:LivingEvent) : void
      {
         this._energyBar.setProgress(this._self.energy / this._self.maxEnergy);
      }
      
      private function _keyDown(e:GameKeyEvent) : void
      {
         if(e.charCode == KeyManager.VK_A || e.charCode == KeyManager.VK_LEFT)
         {
            this.__turnLeft();
         }
         else if(e.charCode == KeyManager.VK_D || e.charCode == KeyManager.VK_RIGHT)
         {
            this.__turnRight();
         }
      }
      
      private function _keyUp(e:GameKeyEvent) : void
      {
         this._keyDownTime = 0;
      }
      
      private function __dress(event:LivingEvent) : void
      {
         this._body.dress(event.params[0],event.params[1]);
      }
      
      private function __sendShoot(event:Event) : void
      {
      }
      
      private function __keyUp(event:KeyboardEvent) : void
      {
         this._keyDownTime = 0;
      }
      
      private function __turnLeft() : void
      {
         if(StepManager.Instance.localLock)
         {
            if(info.direction == 1)
            {
               info.direction = -1;
            }
            return;
         }
         if(!this._isShooting)
         {
            if(info.direction == 1)
            {
               info.direction = -1;
               if(this._keyDownTime == 0)
               {
                  this._keyDownTime = getTimer();
               }
            }
            this.walk();
         }
      }
      
      private function __turnRight() : void
      {
         if(StepManager.Instance.localLock)
         {
            if(info.direction == -1)
            {
               info.direction = 1;
            }
            return;
         }
         if(!this._isShooting)
         {
            if(info.direction == -1)
            {
               info.direction = 1;
               if(this._keyDownTime == 0)
               {
                  this._keyDownTime = getTimer();
               }
            }
            this.walk();
         }
      }
      
      public function setWeaponMoiveActionSyc(action:String) : void
      {
         if(Boolean(this._currentWeaponMovie))
         {
            this._currentWeaponMovie.gotoAndPlay(action);
         }
         else
         {
            this._currentWeaponMovieAction = action;
         }
      }
      
      private function checkCurrentMovie(e:Event) : void
      {
         if(this._weaponMovie == null)
         {
            return;
         }
         this._currentWeaponMovie = this._weaponMovie.getChildAt(0) as MovieClip;
         if(Boolean(this._currentWeaponMovie) && this._currentWeaponMovieAction != "")
         {
            this._weaponMovie.removeEventListener(Event.ENTER_FRAME,this.checkCurrentMovie);
            this.setWeaponMoiveActionSyc(this._currentWeaponMovieAction);
         }
      }
      
      public function shootPoint() : Point
      {
         var p:Point = this._ballpos;
         p = this._body.localToGlobal(p);
         return _map.globalToLocal(p);
      }
      
      public function set weaponMovie(value:MovieClip) : void
      {
         if(value != this._weaponMovie)
         {
            if(Boolean(this._weaponMovie) && Boolean(this._weaponMovie.parent))
            {
               this._weaponMovie.removeEventListener(Event.ENTER_FRAME,this.checkCurrentMovie);
               this._weaponMovie.parent.removeChild(this._weaponMovie);
            }
            this._weaponMovie = value;
            this._currentWeaponMovie = null;
            this._currentWeaponMovieAction = "";
            if(Boolean(this._weaponMovie))
            {
               this._weaponMovie.stop();
               this._weaponMovie.addEventListener(Event.ENTER_FRAME,this.checkCurrentMovie);
               this._weaponMovie.x = this._body.weaponX * this._body.scaleX;
               this._weaponMovie.y = this._body.weaponY * this._body.scaleY;
               this._weaponMovie.scaleX = this._body.scaleX;
               this._weaponMovie.scaleY = this._body.scaleY;
               this._weaponMovie.visible = false;
               this._player.addChild(this._weaponMovie);
            }
         }
      }
      
      public function get weaponMovie() : MovieClip
      {
         return this._weaponMovie;
      }
      
      protected function walk() : void
      {
         if(!_isMoving && this.localPlayer.isAttacking && (this._keyDownTime == 0 || getTimer() - this._keyDownTime > MAX_MOVE_TIME))
         {
            act(new SelfPlayerWalkAction(this));
         }
      }
      
      override public function doAction(actionType:*, callBack:Function = null, args:Array = null) : void
      {
         if(Boolean(this._body))
         {
            this._body.doAction(actionType);
         }
      }
      
      override protected function __shoot(event:LivingEvent) : void
      {
         if(!_info.isShootPrepared)
         {
            map.act(new PrepareShootAction(this));
         }
         map.act(new ShootBombAction(this,event.params[0],20));
      }
   }
}

