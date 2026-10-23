package road7th.game.view.smallMap
{
   import flash.display.BitmapData;
   import flash.display.Graphics;
   import flash.display.Shape;
   import flash.display.Sprite;
   import flash.geom.Matrix;
   import flash.geom.Rectangle;
   import phy.object.PhysicalObj;
   import phy.object.SmallObject;
   import road7th.core.Global;
   import road7th.events.MapEvent;
   import road7th.game.view.MapView;
   import road7th.interfaces.IProcessObject;
   import road7th.manager.ProcessManager;
   import road7th.utils.ClassUtils;
   
   public class SmallMapView extends Sprite implements IProcessObject
   {
      
      private var _bg:Sprite;
      
      private var _foreground:Shape;
      
      private var _lineRef:BitmapData;
      
      private var _backBar:BackBar;
      
      private var _dragView:Shape;
      
      private var _thingLayer:Sprite;
      
      private const BG_WIDTH:int = 187;
      
      private const BG_HEIGHT:int = 95;
      
      private var _dragwidth:int = 14;
      
      private var _dragheight:int = 68;
      
      private var _drawMatrix:Matrix;
      
      private var _w:int = 100;
      
      private var _h:int = 100;
      
      private var _mapwidth:int;
      
      private var _mapheight:int;
      
      private var _map:MapView;
      
      private var _mapShape:Shape;
      
      private var _objects:Vector.<SmallObject> = new Vector.<SmallObject>();
      
      private var _onProcess:Boolean = false;
      
      public function SmallMapView()
      {
         super();
         this._drawMatrix = new Matrix();
         this.configUI();
      }
      
      private function configUI() : void
      {
         this._lineRef = ClassUtils.CreatInstance("asset.game.lineAsset");
         this._mapShape = new Shape();
         addChild(this._mapShape);
         this._dragView = new Shape();
         addChild(this._dragView);
         this._drawDragView();
         this._backBar = new BackBar(this.BG_WIDTH);
         addChild(this._backBar);
         this._thingLayer = new Sprite();
         addChild(this._thingLayer);
         this._thingLayer.x = this._mapShape.x = 1;
         this._thingLayer.y = this._mapShape.y = this._backBar.height;
         this._h += this._backBar.height;
         this.drawBackground();
      }
      
      private function drawBackground() : void
      {
         var pen:Graphics = graphics;
         pen.clear();
         pen.beginBitmapFill(this._lineRef);
         pen.lineStyle(1,8816262);
         pen.drawRect(0,0,this._w,this._h);
         pen.endFill();
      }
      
      private function addEvent(map:MapView) : void
      {
         this._map.addEventListener(MapEvent.Update,this.__updateMap);
         this._map.addEventListener(MapEvent.AddThing,this.__addThing);
         this._map.addEventListener(MapEvent.RemoveThing,this.__removeThing);
      }
      
      private function __removeThing(event:MapEvent) : void
      {
         var thing:PhysicalObj = event.params[0];
         if(thing.smallView != null)
         {
            this.removeObj(thing.smallView);
         }
      }
      
      private function __addThing(event:MapEvent) : void
      {
         var thing:PhysicalObj = event.params[0];
         if(thing.smallView != null)
         {
            this.addObj(thing.smallView);
         }
      }
      
      private function removeEvent(map:MapView) : void
      {
         this._map.removeEventListener(MapEvent.Update,this.__updateMap);
      }
      
      public function setMap(map:MapView) : void
      {
         if(Boolean(this._map))
         {
            this.removeEvent(this._map);
         }
         this._map = map;
         var _loc2_:* = 96 / this._map.bound.height;
         this._drawMatrix.d = 96 / this._map.bound.height;
         this._drawMatrix.a = _loc2_;
         this._mapwidth = this._drawMatrix.a * this._map.bound.width + 1;
         this._mapheight = this._drawMatrix.d * this._map.bound.height;
         this._dragwidth = Global.stageWidth * this._drawMatrix.a;
         this._dragheight = Global.stageHeight * this._drawMatrix.d;
         this._thingLayer.scrollRect = new Rectangle(0,0,this._mapwidth,this._mapheight);
         this._w = this._mapwidth + 2;
         this._h = this._mapheight + this._backBar.height + 2;
         this._backBar.width = this._w;
         this.drawBackground();
         this._drawDragView();
         this.drawMap();
         this.addEvent(this._map);
         if(!this._onProcess)
         {
            ProcessManager.Instance.addObject(this);
         }
      }
      
      private function __updateMap(event:MapEvent) : void
      {
         this.setScreenPos(this._map.x,this._map.y);
      }
      
      public function setScreenPos(posX:Number, posY:Number) : void
      {
         var newX:Number = Math.abs(posX * this._drawMatrix.a);
         var newY:Number = Math.abs(posY * this._drawMatrix.d) + this._backBar.height;
         var bounds:Rectangle = this._dragView.getBounds(this);
         if(newX + this._dragView.width >= this._w)
         {
            this._dragView.x = this._w - this._dragView.width;
         }
         else if(newX < 0)
         {
            this._dragView.x = 0;
         }
         else
         {
            this._dragView.x = newX;
         }
         if(newY + this._dragView.height >= this._h)
         {
            this._dragView.y = this._h - this._dragView.height;
         }
         else if(newY < this._backBar.height)
         {
            this._dragView.y = 0;
         }
         else
         {
            this._dragView.y = newY;
         }
      }
      
      private function drawMap() : void
      {
         if(!this._map.stone)
         {
            return;
         }
         var pen:Graphics = this._mapShape.graphics;
         pen.clear();
         pen.beginBitmapFill(this._map.stone.bitmapData,this._drawMatrix,false,true);
         pen.drawRect(0,0,this._w,this._mapheight);
         pen.endFill();
      }
      
      private function _drawDragView() : void
      {
         this._dragView.graphics.clear();
         this._dragView.graphics.lineStyle(1,10066329);
         this._dragView.graphics.beginFill(16777215,0.4);
         this._dragView.graphics.drawRect(0,0,this._dragwidth,this._dragheight);
         this._dragView.graphics.endFill();
      }
      
      public function changeDrag(percentX:uint, percentY:uint) : void
      {
         this._dragView.x = this._bg.width * percentX / 100 >= this._bg.width - this._dragView.width ? Number(this._bg.width - this._dragView.width) : Number(this._bg.width * percentX / 100);
         this._dragView.y = this._bg.height * percentY / 100 + this._bg.y >= this._bg.height - this._dragView.height + this._bg.y ? Number(this._bg.height - this._dragView.height + this._bg.y) : Number(this._bg.height * percentY / 100 + this._bg.y);
      }
      
      public function addObj(object:SmallObject) : void
      {
         if(!object.onProcess)
         {
            this._objects.push(object);
            object.onProcess = true;
            this._thingLayer.addChild(object);
         }
      }
      
      public function removeObj(object:SmallObject) : void
      {
         var idx:int = 0;
         if(object.parent == this._thingLayer)
         {
            this._thingLayer.removeChild(object);
         }
         if(object.onProcess)
         {
            idx = this._objects.indexOf(object);
            if(idx >= 0)
            {
               this._objects.splice(idx,1);
            }
            object.onProcess = false;
         }
      }
      
      public function dispose() : void
      {
      }
      
      public function get onProcess() : Boolean
      {
         return this._onProcess;
      }
      
      public function set onProcess(val:Boolean) : void
      {
         this._onProcess = val;
      }
      
      public function get priority() : int
      {
         return 0;
      }
      
      public function process(rate:Number) : void
      {
         var obj:* = null;
         for each(obj in this._objects)
         {
            obj.onFrame(rate);
            obj.x = obj.pos.x * this._drawMatrix.a;
            obj.y = obj.pos.y * this._drawMatrix.d;
            if(Boolean(obj.isAttacking) && Boolean(obj.parent))
            {
               obj.parent.setChildIndex(obj,obj.parent.numChildren - 1);
            }
         }
      }
   }
}

