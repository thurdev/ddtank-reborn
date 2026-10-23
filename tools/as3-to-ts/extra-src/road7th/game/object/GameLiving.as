package road7th.game.object
{
   import flash.display.BitmapData;
   import flash.filters.GlowFilter;
   import flash.geom.Matrix;
   import flash.geom.Point;
   import flash.text.TextField;
   import flash.text.TextFormat;
   import phy.object.PhysicalObj;
   import phy.object.PhysicsLayer;
   import phy.object.SmallObject;
   import road.game.resource.ActionMovie;
   import road7th.events.LivingEvent;
   import road7th.game.actions.BaseAction;
   import road7th.game.actions.LivingActionType;
   import road7th.game.actions.LivingMoveAction;
   import road7th.game.left.LeftPlayerCartoonView;
   import road7th.game.model.Living;
   import road7th.game.view.MapView;
   import road7th.game.view.living.HealthBar;
   import road7th.game.view.smallMap.SmallLiving;
   import road7th.manager.GameManager;
   import road7th.utils.ClassUtils;
   import road7th.utils.TeamUtils;
   
   public class GameLiving extends PhysicalObj
   {
      
      public static const stepY:int = 7;
      
      protected var _info:Living;
      
      protected var _healthBar:HealthBar;
      
      protected var _nicknameField:TextField;
      
      protected var _smallView:SmallLiving;
      
      protected var speedMult:int = 1;
      
      private var _speedX:Number = 3;
      
      private var _speedY:Number = 7;
      
      public var isExist:Boolean = true;
      
      protected var _isDie:Boolean = false;
      
      protected var _actionMovie:ActionMovie;
      
      public function GameLiving(living:Living)
      {
         this._info = living;
         super(this._info.LivingID);
         mouseEnabled = false;
         mouseChildren = false;
         this.configUI();
         this.addEvent();
      }
      
      protected function configUI() : void
      {
         this._healthBar = new HealthBar(TeamUtils.getTeamColor(this._info.team));
         this._healthBar.x = -this._healthBar.width >> 1;
         this._healthBar.y = 10;
         addChild(this._healthBar);
         this._nicknameField = new TextField();
         var format:TextFormat = new TextFormat("Arial",12,TeamUtils.getTeamColor(this._info.team),false,false,null,null,null,"left");
         this._nicknameField.defaultTextFormat = format;
         this._nicknameField.filters = [new GlowFilter(0,1,3,3,10)];
         this._nicknameField.x = this._healthBar.x;
         this._nicknameField.y = this._healthBar.y + this._healthBar.height;
         this._nicknameField.width = 100;
         this._nicknameField.height = 20;
         this._nicknameField.text = this._info.name;
         addChild(this._nicknameField);
         this.creatBody();
         this.creatSmallView();
         this.creatArm();
         x = this._info.pos.x;
         y = this._info.pos.y;
      }
      
      override public function get smallView() : SmallObject
      {
         return this._smallView;
      }
      
      protected function creatSmallView() : void
      {
         this._smallView = new SmallLiving();
         this._smallView.pos.x = this._info.pos.x;
         this._smallView.pos.y = this._info.pos.y;
         this._smallView.info = this._info;
      }
      
      public function get movie() : ActionMovie
      {
         return this._actionMovie;
      }
      
      protected function addEvent() : void
      {
         this._info.addEventListener(LivingEvent.AttackChanged,this.__attackChanged);
         this._info.addEventListener(LivingEvent.DirectionChanged,this.__directionChanged);
         this._info.addEventListener(LivingEvent.PosChanged,this.__posChanged);
         this._info.addEventListener(LivingEvent.Shoot,this.__shoot);
         this._info.addEventListener(LivingEvent.MoveTo,this.__moveTo);
         this._info.addEventListener(LivingEvent.PLAY_MOVIE,this.__playMovie);
         this._info.addEventListener(LivingEvent.BloodChanged,this._bloodChanged);
      }
      
      private function _bloodChanged(e:LivingEvent) : void
      {
         this._healthBar.drawByNum(this._info.blood / this._info.maxBlood);
      }
      
      protected function __playMovie(event:LivingEvent) : void
      {
         this._actionMovie.doAction(event.params[0]);
      }
      
      private function __moveTo(event:LivingEvent) : void
      {
         var offset:* = null;
         var action:String = event.params[4];
         this.doAction(action);
         var speed:int = int(event.params[5]);
         if(speed == 0)
         {
            speed = GameManager.LivingDefaultSpeed;
         }
         var pt:Point = event.params[1] as Point;
         var dir:int = int(event.params[2]);
         var endAction:String = event.params[6];
         var endFunc:Function = event.params[7];
         if(x == pt.x && y == pt.y)
         {
            return;
         }
         var path:* = [];
         var tx:int = x;
         var ty:int = y;
         var thisPos:Point = new Point(x,y);
         var direction:int = pt.x > tx ? 1 : int(-1);
         var p:Point = new Point(x,y);
         if(action.substr(0,3) == "fly")
         {
            offset = new Point(pt.x - p.x,pt.y - p.y);
            while(offset.length > speed)
            {
               offset.normalize(speed);
               p = new Point(p.x + offset.x,p.y + offset.y);
               offset = new Point(pt.x - p.x,pt.y - p.y);
               if(!p)
               {
                  path.push(pt);
               }
               path.push(p);
            }
         }
         else
         {
            while((pt.x - tx) * direction > 0)
            {
               p = _map.findNextWalkPoint(tx,ty,direction,speed * GameManager.npcStepX,speed * GameManager.npcStepY);
               if(!p)
               {
                  break;
               }
               path.push(p);
               tx = p.x;
               ty = p.y;
            }
         }
         if(path.length > 0)
         {
            this._info.act(new LivingMoveAction(this,path,dir,endAction,endFunc));
         }
         else
         {
            if(endAction != "")
            {
               this.doAction(endAction);
            }
            else
            {
               this._info.doDefaultAction();
            }
            if(endFunc != null)
            {
               endFunc();
            }
         }
      }
      
      protected function __shoot(event:LivingEvent) : void
      {
      }
      
      protected function __posChanged(event:LivingEvent) : void
      {
         var angle:Number = NaN;
         pos = this._info.pos;
         if(_isLiving)
         {
            angle = calcObjectAngle(16);
         }
         if(Boolean(this._smallView))
         {
            this._smallView.pos.x = x;
            this._smallView.pos.y = y;
         }
      }
      
      protected function __directionChanged(event:LivingEvent) : void
      {
      }
      
      protected function __attackChanged(event:LivingEvent) : void
      {
         if(Boolean(this._smallView))
         {
            this._smallView.isAttacking = this._info.isAttacking;
         }
      }
      
      protected function creatBody() : void
      {
         var shot:* = null;
         var mat:* = null;
         if(ClassUtils.hasDefinition(this._info.actionMovieName))
         {
            this._actionMovie = ClassUtils.CreatInstance(this._info.actionMovieName);
            this._actionMovie.mouseEnabled = false;
            this._actionMovie.mouseChildren = false;
            this._actionMovie.scrollRect = null;
            addChild(this._actionMovie);
            this._actionMovie.gotoAndStop(LivingActionType.Show2);
            this._actionMovie.scaleX = -this._info.direction;
            this._actionMovie.doAction(LivingActionType.Show2);
            shot = new BitmapData(LeftPlayerCartoonView.CartoonWidth,LeftPlayerCartoonView.CartoonHeight,true,0);
            mat = new Matrix(1,0,0,1,80,100);
            shot.draw(this._actionMovie,mat);
            this._info.shot = shot;
            this._actionMovie.gotoAndStop(1);
            return;
         }
         throw new Error("找不到 info.actionMovieName : " + this.info.actionMovieName);
      }
      
      protected function creatArm() : void
      {
      }
      
      public function get info() : Living
      {
         return this._info;
      }
      
      public function get map() : MapView
      {
         return _map as MapView;
      }
      
      public function needFocus(offsetX:int = 0, offsetY:int = 0, data:Object = null) : void
      {
         if(this._info.focus)
         {
            this.map.livingSetCenter(x + offsetX,y + offsetY - 150,true,2,data);
         }
      }
      
      public function canMoveDirection(dir:Number) : Boolean
      {
         return !this.map.IsOutMap(x + (15 + GameManager.MOVE_SPEED) * dir,y);
      }
      
      public function get stepX() : int
      {
         return this._speedX * this.speedMult;
      }
      
      public function get stepY() : int
      {
         return this._speedY * this.speedMult;
      }
      
      public function getNextWalkPoint(dir:int) : Point
      {
         if(this.canMoveDirection(dir))
         {
            return _map.findNextWalkPoint(x,y,dir,this.stepX,this.stepY);
         }
         return null;
      }
      
      public function canStand(x:int, y:int) : Boolean
      {
         return !this.map.IsEmpty(x - 1,y) || !this.map.IsEmpty(x + 1,y);
      }
      
      public function act(action:BaseAction) : void
      {
         this._info.act(action);
      }
      
      final override public function update(dt:Number) : void
      {
         if(this._isDie)
         {
            return;
         }
         super.update(dt);
         this._info.update();
      }
      
      public function doAction(actionType:*, callBack:Function = null, args:Array = null) : void
      {
         if(this._actionMovie != null)
         {
            this._actionMovie.doAction(actionType,callBack,args);
         }
      }
      
      override public function get layer() : int
      {
         return PhysicsLayer.GameLiving;
      }
      
      protected function removeEvent() : void
      {
      }
      
      override public function dispose() : void
      {
         this.removeEvent();
         if(Boolean(parent))
         {
            parent.removeChild(this);
         }
         this.isExist = false;
      }
   }
}

