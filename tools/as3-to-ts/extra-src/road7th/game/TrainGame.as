package road7th.game
{
   import com.pickgliss.ui.core.Disposeable;
   import com.pickgliss.utils.ObjectUtils;
   import flash.display.Sprite;
   import flash.geom.Point;
   import flash.utils.Dictionary;
   import phy.object.PhysicalObj;
   import road7th.core.Global;
   import road7th.data.GameState;
   import road7th.events.GameEvent;
   import road7th.game.actions.GameOverAction;
   import road7th.game.left.LeftPlayerCartoonView;
   import road7th.game.model.Bomb;
   import road7th.game.model.Box;
   import road7th.game.model.GameInfo;
   import road7th.game.model.Living;
   import road7th.game.model.LocalPlayer;
   import road7th.game.object.GameLiving;
   import road7th.game.object.GameLocalPlayer;
   import road7th.game.view.EnergyView;
   import road7th.game.view.MapView;
   import road7th.game.view.blood.ShootPercentView;
   import road7th.game.view.prompt.PromptManager;
   import road7th.game.view.smallMap.SmallMapView;
   import road7th.game.view.state.ToolStripView;
   import road7th.manager.GameManager;
   import road7th.manager.SoundManager;
   import road7th.manager.StepManager;
   import road7th.utils.ClassUtils;
   import road7th.utils.MovieClipWrapper;
   
   public class TrainGame extends Sprite implements Disposeable
   {
      
      private var _map:MapView;
      
      private var _game:GameInfo;
      
      private var _energyView:EnergyView;
      
      private var _stateView:ToolStripView;
      
      private var _smallMapView:SmallMapView;
      
      private var _leftCartoonView:LeftPlayerCartoonView;
      
      private var _boxs:Dictionary = new Dictionary();
      
      private var _livings:Dictionary = new Dictionary();
      
      private var _selfPlayer:GameLiving;
      
      private const ENERGY_X:int = 102;
      
      private const ENERGY_Y:int = 555;
      
      private const STATE_X:int = 781;
      
      private const STATE_Y:int = 554;
      
      private const SMALLMAP_X:int = 811;
      
      private const SMALLMAP_Y:int = 2;
      
      public function TrainGame(game:GameInfo)
      {
         super();
         this._game = game;
         this.configUI();
         this.addEvent();
         StepManager.Instance.gameView = this;
         StepManager.Instance.gotoStep(StepManager.Instance.STEPI);
         GameManager.Instance.turnTo(this._game.selfGamePlayer);
      }
      
      private function configUI() : void
      {
         this._map = new MapView(this._game);
         addChild(this._map);
         SoundManager.instance.playGameBackMusic(this._game.map.music);
         SoundManager.instance.stopAllSound();
         this._energyView = new EnergyView(this._game.selfGamePlayer);
         addChild(this._energyView);
         this._energyView.x = this.ENERGY_X;
         this._energyView.y = this.ENERGY_Y;
         this._stateView = new ToolStripView(this._game.selfGamePlayer);
         addChild(this._stateView);
         this._stateView.x = this.STATE_X;
         this._stateView.y = this.STATE_Y;
         this._smallMapView = new SmallMapView();
         addChild(this._smallMapView);
         this._smallMapView.setMap(this._map);
         this._smallMapView.x = this.SMALLMAP_X;
         this._smallMapView.y = this.SMALLMAP_Y;
         this.creatLivings();
         var pos:Point = this._game.selfGamePlayer.pos;
         this._map.setCenter(pos.x,pos.y,false);
      }
      
      public function setEnergyViewVis(boo:Boolean) : void
      {
         this._energyView.visible = boo;
      }
      
      public function get selfPlayer() : GameLiving
      {
         return this._selfPlayer;
      }
      
      public function set selfPlayer(value:GameLiving) : void
      {
         if(this._selfPlayer == value)
         {
            return;
         }
         this._selfPlayer = value;
      }
      
      private function creatLivings() : void
      {
         var id:* = null;
         var living:* = null;
         var gameLiving:* = null;
         for(id in this._game.livings)
         {
            living = this._game.livings[id];
            if(Boolean(living.isSelf))
            {
               gameLiving = new GameLocalPlayer(LocalPlayer(living));
               this._selfPlayer = gameLiving;
            }
            else
            {
               gameLiving = new GameLiving(living);
            }
            this._map.addPhysical(gameLiving);
         }
      }
      
      private function addEvent() : void
      {
         this._game.addEventListener(GameEvent.AddBox,this.__addBox);
         this._game.addEventListener(GameEvent.RemoveBox,this.__removeBox);
         this._game.addEventListener(GameEvent.AddLiving,this.__addLiving);
         this._game.addEventListener(GameEvent.RemoveLiving,this.__removeLiving);
         this._game.addEventListener(GameEvent.CurrentChanged,this.__currentChanged);
         this._game.addEventListener(GameEvent.StateChanged,this.__stateChanged);
         this._game.addEventListener(GameEvent.GameOver,this.__gameOver);
         GameManager.Instance.addEventListener(GameEvent.HitLiving,this._hitLiving);
         GameManager.Instance.addEventListener(GameEvent.HitSelf,this._hitSelf);
      }
      
      private function __gameOver(event:GameEvent) : void
      {
         this._map.act(new GameOverAction(this._map,this.trainOver));
      }
      
      private function trainOver() : void
      {
         Global.trainOver();
      }
      
      private function __stateChanged(event:GameEvent) : void
      {
         if(this._leftCartoonView == null && this._game.state == GameState.Fight)
         {
            this._leftCartoonView = new LeftPlayerCartoonView(this._game);
            addChild(this._leftCartoonView);
         }
      }
      
      private function __addBox(e:GameEvent) : void
      {
         var boxInfo:Box = null;
         var box:PhysicalObj = null;
         boxInfo = e.params[0];
         box = ClassUtils.CreatInstance(boxInfo.className);
         box.x = boxInfo.x;
         box.y = boxInfo.y;
         this._boxs[boxInfo.name] = box;
         this._map.addPhysical(box);
      }
      
      private function __removeBox(e:GameEvent) : void
      {
         var str:String = e.params[0];
         this._boxs[str].dispose();
         this._boxs[str] = null;
      }
      
      private function __currentChanged(event:GameEvent) : void
      {
         var _turnMovie:* = null;
         var living:Living = this._game.currentLiving;
         var pt:Point = living.pos;
         if(living.isSelf && StepManager.Instance.nowStep != StepManager.Instance.STEPI && StepManager.Instance.nowStep != StepManager.Instance.STEPII)
         {
            _turnMovie = new MovieClipWrapper(ClassUtils.CreatInstance("asset.game.TurnAsset"),true,true);
            _turnMovie.repeat = false;
            _turnMovie.movie.x = 440;
            _turnMovie.movie.y = 200;
            _turnMovie.movie.mouseEnabled = false;
            _turnMovie.movie.mouseChildren = false;
            addChild(_turnMovie.movie);
            SoundManager.instance.play("016");
         }
         if(living.focus)
         {
            this._map.setCenter(pt.x,pt.y,true);
         }
      }
      
      private function __removeLiving(e:GameEvent) : void
      {
         var str:String = String(e.params[0].LivingID);
         this._map.removePhysical(this._livings[str]);
         this._livings[str] = null;
      }
      
      private function __addLiving(e:GameEvent) : void
      {
         var gameLiving:GameLiving = new GameLiving(e.params[0]);
         this._map.addPhysical(gameLiving);
         this._livings[String(Living(e.params[0]).LivingID)] = gameLiving;
         gameLiving.doAction(Living.BORN_ACTION,this._boguBuildOver);
         this._map.setCenter(gameLiving.x,gameLiving.y,true);
      }
      
      private function _boguBuildOver() : void
      {
         if(StepManager.Instance.nowStep == StepManager.Instance.STEPIII)
         {
            addChild(PromptManager.Instance.build(PromptManager.Instance.SHOW_BOGU_SPEAK_I,true,new Point(574,365)));
         }
         else if(StepManager.Instance.nowStep == StepManager.Instance.STEPV)
         {
            StepManager.Instance.boduSpeakII();
         }
      }
      
      private function _hitLiving(e:GameEvent) : void
      {
         var living:Living = null;
         var bomb:Bomb = null;
         living = null;
         var _removeLiving:Function = null;
         _removeLiving = function():void
         {
            GameManager.Instance.Current.removeLiving(living);
         };
         bomb = e.params[0];
         living = e.params[1];
         var shootPer:ShootPercentView = new ShootPercentView(bomb.attack);
         shootPer.x = living.pos.x;
         shootPer.y = living.pos.y;
         this._map.addToPhyLayer(shootPer);
         if(living.blood - bomb.attack <= 0)
         {
            living.blood = 0;
            this._livings[String(living.LivingID)].doAction(Living.DIE_ACTION,_removeLiving);
            if(StepManager.Instance.nowStep == StepManager.Instance.STEPIII)
            {
               StepManager.Instance.gotoStep(StepManager.Instance.STEPIV);
            }
            else if(StepManager.Instance.nowStep == StepManager.Instance.STEPV)
            {
               StepManager.Instance.gotoStep(StepManager.Instance.STEPVI);
            }
         }
         else
         {
            living.blood -= bomb.attack;
         }
      }
      
      private function _hitSelf(e:GameEvent) : void
      {
         var bomb:Bomb = e.params[0];
         var living:Living = e.params[1];
         var shootPer:ShootPercentView = new ShootPercentView(bomb.attack);
         shootPer.x = living.pos.x;
         shootPer.y = living.pos.y;
         this._map.addToPhyLayer(shootPer);
      }
      
      private function removeEvent() : void
      {
         this._game.removeEventListener(GameEvent.AddBox,this.__addBox);
         this._game.removeEventListener(GameEvent.RemoveBox,this.__removeBox);
         this._game.removeEventListener(GameEvent.AddLiving,this.__addLiving);
         this._game.removeEventListener(GameEvent.RemoveLiving,this.__removeLiving);
         this._game.removeEventListener(GameEvent.CurrentChanged,this.__currentChanged);
         GameManager.Instance.removeEventListener(GameEvent.HitLiving,this._hitLiving);
      }
      
      public function dispose() : void
      {
         this.removeEvent();
         if(Boolean(parent))
         {
            parent.removeChild(this);
         }
         ObjectUtils.disposeObject(this._map);
         this._map = null;
         ObjectUtils.disposeObject(this._energyView);
         this._energyView = null;
         ObjectUtils.disposeObject(this._leftCartoonView);
         this._leftCartoonView = null;
         ObjectUtils.disposeObject(this._stateView);
         this._stateView = null;
         ObjectUtils.disposeObject(this._smallMapView);
         this._smallMapView = null;
      }
   }
}

