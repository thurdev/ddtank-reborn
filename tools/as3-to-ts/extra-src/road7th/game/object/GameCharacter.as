package road7th.game.object
{
   import com.pickgliss.utils.ObjectUtils;
   import flash.display.Bitmap;
   import flash.display.BitmapData;
   import flash.display.Sprite;
   import flash.geom.Point;
   import flash.geom.Rectangle;
   import road7th.data.EquipType;
   import road7th.game.actions.PlayerAction;
   import road7th.interfaces.IProcessObject;
   import road7th.manager.ProcessManager;
   
   public class GameCharacter extends Sprite implements IProcessObject
   {
      
      public static const CHARACTER_WIDTH:Number = 114;
      
      public static const CHARACTER_HEIGHT:Number = 95;
      
      public static const FULL_HP:int = 1;
      
      public static const LACK_HP:int = 2;
      
      public static const CRY:PlayerAction = new PlayerAction("cry",[16,16,17,17,18,18,16,16,17,17,18,18,16,16,17,17,18,18,16,16,17,17,18,18,16,16,17,17,18,18],false,false,false);
      
      public static const CRYLOOP:PlayerAction = new PlayerAction("cryLoop",[16,16,17,17,18,18,16,16,17,17,18,18,16,16,17,17,18,18,16,16,17,17,18,18,16,16,17,17,18,18],false,true,false);
      
      public static const HANDCLIP:PlayerAction = new PlayerAction("handclip",[13,13,14,14,15,15,14,14,13,13,14,14,15,15,14,14,13,13,14,14,15,15,14,14,13,13,14,14,15,15,14,14,13,13,14,14,15,15,14,14,13,13,14,14,15,15,14,14,13,13],true,false,false);
      
      public static const HIDEGUN:PlayerAction = new PlayerAction("hidegun",[27],true,false,false);
      
      public static const HIDETHROWS:PlayerAction = new PlayerAction("hidethrows",[35],true,false,false);
      
      public static const HIT:PlayerAction = new PlayerAction("hit",[12,12,24,24,24,24,24,24,24,24,25,25,38,38,38,38,11,11,11,11],false,false,false);
      
      public static const SHAKE:PlayerAction = new PlayerAction("shake",[6,6,7,7,8,8,9,9,8,8,7,7,6,6],false,false,false);
      
      public static const SHOT:PlayerAction = new PlayerAction("shot",[22,23,26,27],true,false,true);
      
      public static const SHOWGUN:PlayerAction = new PlayerAction("showgun",[19,20,21,21,21],true,false,true);
      
      public static const SHOWTHROWS:PlayerAction = new PlayerAction("showthrows",[28,29,30,30,30],true,false,true);
      
      public static const SOUL:PlayerAction = new PlayerAction("soul",[36],false,true,false);
      
      public static const STAND:PlayerAction = new PlayerAction("stand",[10,10,10,10,10,10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,6,7,7,8,8,9,9,9,9,8,8,7,7,6,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,10,10,10,10,10,0,0,0,0],false,true,false);
      
      public static const STOPSHOT:PlayerAction = new PlayerAction("stopshot",[23],true,false,false);
      
      public static const STOPTHROWS:PlayerAction = new PlayerAction("stopthrows",[34],true,false,false);
      
      public static const THROWS:PlayerAction = new PlayerAction("throws",[31,32,33,34,35],true,false,true);
      
      public static const WALK:PlayerAction = new PlayerAction("walk",[1,1,2,2,3,3,4,4,5,5],false,false,false);
      
      public static const LAUGH:PlayerAction = new PlayerAction("laugh",[23],false,false,false);
      
      private var _onProcess:Boolean = false;
      
      private var _currentframe:int = 0;
      
      private var _bitmapData:BitmapData;
      
      private var _playerBitmapData:BitmapData;
      
      private var _frameRects:Vector.<Rectangle> = new Vector.<Rectangle>();
      
      private var _frameBitmaps:Vector.<Bitmap> = new Vector.<Bitmap>();
      
      private var _frameStartPoint:Point = new Point(0,0);
      
      private var _isPlaying:Boolean = false;
      
      private var _currentAction:PlayerAction;
      
      private var _defaultAction:PlayerAction;
      
      private var _index:int;
      
      private var _bitmapChanged:Boolean = false;
      
      public function GameCharacter(bitmap:BitmapData)
      {
         super();
         y -= 83;
         mouseChildren = false;
         mouseChildren = false;
         this._bitmapData = bitmap;
         this._currentAction = STAND;
         this._defaultAction = STAND;
         this.drawAllRect();
         this.drawAllFrame(this._bitmapData);
         ProcessManager.Instance.addObject(this);
      }
      
      public function get weaponX() : int
      {
         return -CHARACTER_WIDTH / 2 - 5;
      }
      
      public function get weaponY() : int
      {
         return -CHARACTER_HEIGHT + 12;
      }
      
      public function doAction(actionType:*) : void
      {
         if(this._currentAction.canReplace(actionType))
         {
            this._currentAction = actionType;
            trace(this._currentAction.type);
            this._index = 0;
         }
         this._isPlaying = true;
      }
      
      private function drawFrame(frame:int) : void
      {
         if(frame < 0 || frame >= this._frameRects.length)
         {
            frame = 0;
         }
         if(frame != this._currentframe || this._bitmapChanged)
         {
            this._bitmapChanged = false;
            this._currentframe = frame;
            while(numChildren > 0)
            {
               removeChildAt(0);
            }
            this._frameBitmaps[this._currentframe].x = -GameCharacter.CHARACTER_WIDTH >> 1;
            addChild(this._frameBitmaps[this._currentframe]);
         }
      }
      
      private function cleaAllFrame() : void
      {
         var frame:* = null;
         while(this._frameBitmaps.length > 0)
         {
            frame = this._frameBitmaps.shift();
            ObjectUtils.disposeObject(frame);
         }
      }
      
      private function drawAllRect() : void
      {
         var i:int = 0;
         var m:* = null;
         for(var j:int = 0; j < 3; j++)
         {
            for(i = 0; i < 13; i++)
            {
               m = new Rectangle(i * CHARACTER_WIDTH,j * CHARACTER_HEIGHT,CHARACTER_WIDTH,CHARACTER_HEIGHT);
               this._frameRects.push(m);
            }
         }
      }
      
      private function drawAllFrame(bitmap:BitmapData) : void
      {
         var bmd:* = null;
         var bm:* = null;
         this.cleaAllFrame();
         this._playerBitmapData = new BitmapData(bitmap.width,bitmap.height,true,16711680);
         this._playerBitmapData.draw(bitmap,null,null,null,null,true);
         this._playerBitmapData.lock();
         this._frameBitmaps = new Vector.<Bitmap>();
         for(var k:int = 0; k < this._frameRects.length; k++)
         {
            bmd = new BitmapData(CHARACTER_WIDTH,CHARACTER_HEIGHT,true,0);
            bmd.copyPixels(this._playerBitmapData,this._frameRects[k],this._frameStartPoint);
            bm = new Bitmap(bmd,"auto",true);
            this._frameBitmaps.push(bm);
         }
      }
      
      public function dress(bitmap:BitmapData, layer:String) : void
      {
         var newbitmap:BitmapData = new BitmapData(this._bitmapData.width,this._bitmapData.height,true,16711680);
         if(layer == EquipType.Weapon)
         {
            newbitmap.copyPixels(bitmap,bitmap.rect,new Point());
            newbitmap.draw(this._bitmapData);
         }
         else if(layer == EquipType.Hat)
         {
            newbitmap.copyPixels(this._bitmapData,this._bitmapData.rect,new Point());
            newbitmap.draw(bitmap);
         }
         ObjectUtils.disposeObject(this._bitmapData);
         this._bitmapData = newbitmap;
         this.drawAllFrame(this._bitmapData);
      }
      
      public function actionPlaying() : Boolean
      {
         return this._isPlaying;
      }
      
      public function get currentAction() : *
      {
         return this._currentAction;
      }
      
      public function dispose() : void
      {
         ProcessManager.Instance.removeObject(this);
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
         if(this._isPlaying)
         {
            if(this._index < this._currentAction.frames.length)
            {
               this.drawFrame(this._currentAction.frames[this._index++]);
            }
            else if(this._currentAction.repeat)
            {
               this._index = 0;
            }
            else if(this._currentAction.stopAtEnd)
            {
               this._isPlaying = false;
            }
            else
            {
               this.doAction(this._defaultAction);
            }
         }
      }
      
      public function get walkAction() : PlayerAction
      {
         return WALK;
      }
   }
}

