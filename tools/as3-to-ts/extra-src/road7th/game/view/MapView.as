package road7th.game.view
{
   import flash.display.Bitmap;
   import phy.maps.Ground;
   import phy.maps.Map;
   import phy.object.Physics;
   import road7th.core.Global;
   import road7th.events.MapEvent;
   import road7th.game.actions.ActionManager;
   import road7th.game.actions.BaseAction;
   import road7th.game.animations.AnimationLevel;
   import road7th.game.animations.AnimationSet;
   import road7th.game.animations.BaseSetCenterAnimation;
   import road7th.game.model.GameInfo;
   import road7th.game.object.GameLocalPlayer;
   import road7th.manager.GameManager;
   
   [Event(name="addThing",type="road7th.events.MapEvent")]
   [Event(name="removeThing",type="road7th.events.MapEvent")]
   [Event(name="update",type="road7th.events.MapEvent")]
   public class MapView extends Map
   {
      
      private var _game:GameInfo;
      
      private var _animateSet:AnimationSet;
      
      private var _minX:Number;
      
      private var _minY:Number;
      
      private var _actionManager:ActionManager = new ActionManager();
      
      private var _x:Number = 0;
      
      private var _y:Number = 0;
      
      public function MapView(game:GameInfo)
      {
         this._game = game;
         var skyBitmap:Bitmap = new Bitmap(this._game.map.backData);
         var stone:Ground = Boolean(this._game.map.deadData) ? new Ground(this._game.map.deadData.clone(),false) : null;
         super(skyBitmap,null,stone);
         this._minX = -bound.width + Global.stageWidth;
         this._minY = -bound.height + Global.stageHeight;
         this._animateSet = new AnimationSet(this,Global.stageWidth,Global.stageHeight);
         this.setCenter(this._game.map.ForegroundWidth / 2,this._game.map.ForegroundHeight / 2,false);
      }
      
      public function setCenter(px:Number, py:Number, isTween:Boolean) : void
      {
         this._animateSet.addAnimation(new BaseSetCenterAnimation(px,py,50,!isTween,AnimationLevel.MIDDLE));
      }
      
      public function livingSetCenter(px:Number, py:Number, isTween:Boolean, priority:int = 2, data:Object = null) : void
      {
         if(Boolean(this._animateSet))
         {
            this._animateSet.addAnimation(new BaseSetCenterAnimation(px,py,25,!isTween,priority,0,data));
         }
      }
      
      public function act(action:BaseAction) : void
      {
         this._actionManager.act(action);
      }
      
      public function spellKill(player:GameLocalPlayer) : void
      {
      }
      
      private function get minX() : Number
      {
         return -bound.width + Global.stageWidth;
      }
      
      private function get minY() : Number
      {
         return -bound.height + Global.stageHeight;
      }
      
      public function get animateSet() : AnimationSet
      {
         return this._animateSet;
      }
      
      override protected function update() : void
      {
         super.update();
         this._actionManager.execute();
         GameManager.Instance.update();
         if(this._animateSet.update())
         {
            this.updateSky();
         }
      }
      
      private function updateSky() : void
      {
         var _skyHScalePercent:Number = (sky.height * scaleY - Global.stageHeight) / (bound.height * scaleY - Global.stageHeight);
         var _skyWScalePercent:Number = (sky.width * scaleX - Global.stageWidth) / (bound.width * scaleX - Global.stageWidth);
         _skyHScalePercent = isNaN(_skyHScalePercent) || _skyHScalePercent == Number.NEGATIVE_INFINITY || _skyHScalePercent == Number.POSITIVE_INFINITY ? 1 : Number(_skyHScalePercent);
         _skyWScalePercent = isNaN(_skyWScalePercent) || _skyWScalePercent == Number.NEGATIVE_INFINITY || _skyWScalePercent == Number.POSITIVE_INFINITY ? 1 : Number(_skyWScalePercent);
         _sky.y = -this.y + this.y * _skyHScalePercent;
         var skyX:Number = -this.x + this.x * _skyWScalePercent;
         if(skyX + _sky.width > width)
         {
            _sky.x = width - _sky.width;
         }
         else
         {
            _sky.x = skyX;
         }
         dispatchEvent(new MapEvent(MapEvent.Update));
      }
      
      override public function addPhysical(phyobj:Physics) : void
      {
         super.addPhysical(phyobj);
         dispatchEvent(new MapEvent(MapEvent.AddThing,phyobj));
      }
      
      override public function removePhysical(phy:Physics) : void
      {
         super.removePhysical(phy);
         dispatchEvent(new MapEvent(MapEvent.RemoveThing,phy));
      }
      
      override public function set x(value:Number) : void
      {
         value = value < this.minX ? Number(this.minX) : (value > 0 ? 0 : Number(value));
         this._x = value;
         this._game.map.x = value;
         super.x = this._x;
      }
      
      override public function set y(value:Number) : void
      {
         value = value < this.minY ? Number(this.minY) : (value > 0 ? 0 : Number(value));
         this._y = value;
         this._game.map.y = value;
         super.y = this._y;
      }
      
      override public function get x() : Number
      {
         return this._x;
      }
      
      override public function get y() : Number
      {
         return this._y;
      }
      
      public function setX(value:Number) : void
      {
         value = value < this.minX ? Number(this.minX) : (value > 0 ? 0 : Number(value));
         this._x = value;
         this._game.map.x = value;
         super.x = this._x;
      }
      
      public function setY(value:Number) : void
      {
         value = value < this.minY ? Number(this.minY) : (value > 0 ? 0 : Number(value));
         this._y = value;
         this._game.map.y = value;
         super.y = this._y;
      }
   }
}

