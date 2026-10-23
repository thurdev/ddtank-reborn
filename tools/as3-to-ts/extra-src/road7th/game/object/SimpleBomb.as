package road7th.game.object
{
   import flash.display.Bitmap;
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.geom.Point;
   import flash.geom.Rectangle;
   import par.ParticleManager;
   import phy.bombs.BaseBomb;
   import phy.maps.Map;
   import phy.object.SmallObject;
   import road7th.game.actions.BombActionType;
   import road7th.game.animations.PhysicalObjFocusAnimation;
   import road7th.game.animations.ShockMapAnimation;
   import road7th.game.model.Bomb;
   import road7th.game.model.GameInfo;
   import road7th.game.model.Living;
   import road7th.game.view.MapView;
   import road7th.game.view.smallMap.SmallBomb;
   import road7th.manager.BallManager;
   import road7th.manager.GameManager;
   import road7th.manager.SoundManager;
   import road7th.manager.StepManager;
   import road7th.utils.MovieClipWrapper;
   
   public class SimpleBomb extends BaseBomb
   {
      
      private var _info:Bomb;
      
      private var _lifeTime:int = 0;
      
      private var _bitmapNum:int = 0;
      
      private var _emitters:Array = new Array();
      
      private var _owner:Living;
      
      protected var _bullet:MovieClip;
      
      protected var _blastOut:MovieClip;
      
      protected var _crater:Bitmap;
      
      protected var _craterBrink:Bitmap;
      
      private var _game:GameInfo;
      
      private var _smallView:SmallObject;
      
      private var _blastMC:MovieClipWrapper;
      
      private var _dir:int;
      
      protected var _spinV:Number;
      
      private var fastModel:Boolean;
      
      public function SimpleBomb(info:Bomb, owner:Living)
      {
         this._info = info;
         this._owner = owner;
         this._dir = owner.direction;
         super(this._info.Id,this._info.Template.Mass,info.Template.Weight,info.Template.Wind,info.Template.DragIndex);
         this.creatBody();
         this.creatSmallView();
      }
      
      private function creatSmallView() : void
      {
         this._smallView = new SmallBomb();
         this._smallView.pos.x = pos.x;
         this._smallView.pos.y = pos.y;
      }
      
      override public function set pos(value:Point) : void
      {
         super.pos = value;
         this._smallView.pos.x = value.x;
         this._smallView.pos.y = value.y;
      }
      
      override public function get smallView() : SmallObject
      {
         return this._smallView;
      }
      
      public function get info() : Bomb
      {
         return this._info;
      }
      
      private function creatBody() : void
      {
         var bombAsset:* = null;
         this._bullet = BallManager.createBulletMovie(this._info.Template.ID);
         this._blastOut = BallManager.createBlastOutMovie(this._info.Template.blastOutID);
         if(BallManager.hasBombAsset(this._info.Template.craterID))
         {
            bombAsset = BallManager.getBombAsset(this._info.Template.craterID);
            this._crater = bombAsset.crater;
            this._craterBrink = bombAsset.craterBrink;
         }
      }
      
      public function get map() : MapView
      {
         return _map as MapView;
      }
      
      protected function initMovie() : void
      {
         super.setMovie(this._bullet,this._crater,this._craterBrink);
         if(Boolean(this._blastOut))
         {
            this._blastOut.x = 0;
            this._blastOut.y = 0;
         }
         if(!this._info)
         {
            return;
         }
         this._blastMC = new MovieClipWrapper(this._blastOut,false,true);
         _testRect = new Rectangle(-3,-3,6,6);
         addSpeedXY(new Point(this._info.VX,this._info.VY));
         this._dir = this._info.VX >= 0 ? 1 : int(-1);
         x = this._info.X;
         y = this._info.Y;
         if(this._info.Template.SpinV > 0)
         {
            _movie.scaleX = this._dir;
         }
         else
         {
            _movie.scaleY = this._dir;
         }
         rotation = motionAngle * 180 / Math.PI;
         if(Boolean(this._owner && !this._owner.isSelf) && Boolean(this._info.Template.ID == Bomb.FLY_BOMB) && this._owner.isHidden)
         {
            this.visible = false;
         }
         mouseEnabled = false;
         mouseChildren = false;
         this.startMoving();
      }
      
      override public function setMap(map:Map) : void
      {
         super.setMap(map);
         if(Boolean(map))
         {
            this._game = GameManager.Instance.Current;
            this.initMovie();
         }
      }
      
      override public function startMoving() : void
      {
         var index:int = 0;
         var emitter:* = null;
         super.startMoving();
         if(GameManager.Instance.Current == null)
         {
            return;
         }
         if(this._info.Template.particalID >= 0 && visible)
         {
            index = 0;
            emitter = ParticleManager.creatEmitter(this._info.Template.particalID);
            if(Boolean(emitter))
            {
               _map.particleEnginee.addEmitter(emitter);
               this._emitters.push(emitter);
            }
         }
         this._spinV = this._info.Template.SpinV * this._dir;
      }
      
      override public function moveTo(p:Point) : void
      {
         var dx:Number = NaN;
         var dy:Number = NaN;
         var count:int = 0;
         var dt:Number = NaN;
         var cur:* = null;
         var dest:* = null;
         var t:int = 0;
         var rect:* = null;
         var list:* = null;
         var e:* = null;
         if(Point.distance(p,pos) >= 3)
         {
            dx = Math.abs(int(p.x) - int(x));
            dy = Math.abs(int(p.y) - int(y));
            count = dx > dy ? int(dx) : int(dy);
            dt = 1 / Number(count);
            cur = pos;
            for(t = Math.abs(count); t > 0; t -= 3)
            {
               dest = Point.interpolate(cur,p,dt * t);
               rect = getCollideRect();
               rect.offset(dest.x,dest.y);
               list = _map.getPhysicalObjects(rect,this);
               if(list.length > 0)
               {
                  this.pos = dest;
                  collideGround();
               }
               else if(!_map.IsRectangleEmpty(rect))
               {
                  this.pos = dest;
                  collideGround();
               }
               else if(_map.IsOutMap(dest.x,dest.y))
               {
                  this.pos = dest;
                  flyOutMap();
               }
               if(!_isMoving)
               {
                  return;
               }
            }
            this.pos = p;
            this.map.animateSet.addAnimation(new PhysicalObjFocusAnimation(this,25));
         }
         if(_isLiving)
         {
            if(_map.IsOutMap(p.x,p.y))
            {
               this.die();
            }
            else
            {
               for each(e in this._emitters)
               {
                  e.x = x;
                  e.y = y;
                  e.angle = motionAngle;
               }
               this.pos = p;
               this.map.animateSet.addAnimation(new PhysicalObjFocusAnimation(this,25));
            }
         }
      }
      
      public function clearWG() : void
      {
         _wf = 0;
         _gf = 0;
         _arf = 0;
      }
      
      override public function bomb() : void
      {
         var p:* = null;
         var radius:int = 0;
         if(this._info.IsHole)
         {
            super.DigMap();
            this.map.resetMapChanged();
         }
         var list:Array = this.map.getPhysicalObjectByPoint(pos,100,this);
         for each(p in list)
         {
            if(p is TombView)
            {
               TombView(p).startMoving();
            }
         }
         this.stopMoving();
         this._info.X = x;
         this._info.Y = y;
         GameManager.Instance.bomb(this._info);
         if(!this.fastModel)
         {
            if(this._info.Template.Shake)
            {
               radius = 7;
               if(this._info.damageMod < 1)
               {
                  radius = 4;
               }
               if(this._info.damageMod > 2)
               {
                  radius = 14;
               }
               this.map.animateSet.addAnimation(new ShockMapAnimation(this,radius));
            }
            else
            {
               this.map.animateSet.addAnimation(new PhysicalObjFocusAnimation(this,10));
            }
         }
         if(!this.fastModel)
         {
            if(_isLiving)
            {
               SoundManager.instance.play(this._info.Template.BombSound);
            }
            if(visible)
            {
               this._blastMC.movie.x = x;
               this._blastMC.movie.y = y;
               _map.addToPhyLayer(this._blastMC.movie);
               this._blastMC.addEventListener(Event.COMPLETE,this.__complete);
               this._blastMC.play();
            }
            else
            {
               this.die();
            }
         }
         else
         {
            this.die();
         }
         if(Boolean(parent))
         {
            parent.removeChild(this);
         }
      }
      
      override public function bombAtOnce() : void
      {
         var boomAction:* = null;
         var action:* = null;
         this.fastModel = true;
         for(var i:int = 0; i < this._info.Actions.length; i++)
         {
            if(this._info.Actions[i].type == BombActionType.BOMB)
            {
               boomAction = this._info.Actions[i];
               break;
            }
         }
         var boomIndex:int = this._info.Actions.indexOf(boomAction);
         var newActions:Array = this._info.Actions.splice(boomIndex,1);
         if(Boolean(boomAction))
         {
            this._info.Actions.push(boomAction);
         }
         while(this._info.Actions.length > 0)
         {
            action = this._info.Actions.shift();
            this._info.UsedActions.push(action);
            action.execute(this,this._game);
            if(!_isLiving)
            {
               return;
            }
         }
         if(Boolean(this._info))
         {
            this._info.Actions = [];
         }
      }
      
      private function __complete(event:Event) : void
      {
         this.die();
      }
      
      override public function die() : void
      {
         super.die();
         this.dispose();
      }
      
      override public function stopMoving() : void
      {
         var e:* = null;
         for each(e in this._emitters)
         {
            _map.particleEnginee.removeEmitter(e);
         }
         this._emitters = [];
         super.stopMoving();
      }
      
      override protected function updatePosition(dt:Number) : void
      {
         this._lifeTime += 60;
         dt = 0.03;
         super.updatePosition(dt);
         if(Boolean(this._info) && this._info.Template.SpinV != 0)
         {
            _movie.rotation += this._info.Template.SpinV * this._dir;
         }
         rotation = motionAngle * 180 / Math.PI;
      }
      
      public function get target() : Point
      {
         if(Boolean(this._info))
         {
            return this._info.target;
         }
         return null;
      }
      
      override public function dispose() : void
      {
         super.dispose();
         if(StepManager.Instance.nowStep == StepManager.Instance.STEPIV)
         {
            StepManager.Instance.gotoStep(StepManager.Instance.STEPV);
         }
         else if(StepManager.Instance.nowStep != StepManager.Instance.STEPVI)
         {
            GameManager.Instance.nextTurn();
         }
         if(Boolean(this._blastMC))
         {
            this._blastMC.removeEventListener(Event.COMPLETE,this.__complete);
            this._blastMC.dispose();
            this._blastMC = null;
         }
         if(Boolean(parent))
         {
            parent.removeChild(this);
         }
         this._crater = null;
         this._craterBrink = null;
         this._owner = null;
         this._emitters = null;
         this._info = null;
         this._game = null;
         this._bullet = null;
         this._blastOut = null;
      }
   }
}

