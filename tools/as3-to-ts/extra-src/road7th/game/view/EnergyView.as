package road7th.game.view
{
   import com.pickgliss.ui.core.Disposeable;
   import flash.display.Bitmap;
   import flash.display.BitmapData;
   import flash.display.Graphics;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.ui.Keyboard;
   import road7th.events.GameKeyEvent;
   import road7th.events.LivingEvent;
   import road7th.game.model.LocalPlayer;
   import road7th.game.view.countDown.SelfMarkManager;
   import road7th.manager.GameManager;
   import road7th.manager.KeyManager;
   import road7th.manager.SoundManager;
   import road7th.manager.StepManager;
   import road7th.utils.ClassUtils;
   
   public class EnergyView extends Sprite implements Disposeable
   {
      
      public static const FORCE_MAX:Number = 2000;
      
      private var _energyBg:Bitmap;
      
      private var _lastBuffBmp:Sprite;
      
      private var _nowBuffBmp:Sprite;
      
      private var _rulingBmp:Bitmap;
      
      private var _slider:Bitmap;
      
      private var _lastBuffBmpData:BitmapData;
      
      private var _nowBuffBmpData:BitmapData;
      
      private var _progress:Number;
      
      private var _nowVol:int = 0;
      
      private var _maxVol:int = 100;
      
      private var _speed:int = 1;
      
      private var _canShoot:Boolean = false;
      
      private const RULING_X:int = 47;
      
      private const RULING_Y:int = 19;
      
      private const BUFF_WIDTH:int = 500;
      
      private const BUFF_HEIGHT:int = 20;
      
      private const SLIDER_X:int = 33;
      
      private const SLIDER_Y:int = 7;
      
      private var _self:LocalPlayer;
      
      private var _rulingSpr:Sprite;
      
      public function EnergyView(self:LocalPlayer)
      {
         this._self = self;
         super();
         this._initUI();
         this._addEvent();
      }
      
      private function _initUI() : void
      {
         this._energyBg = new Bitmap(ClassUtils.CreatInstance("asset.trainer1.power.back"));
         this._rulingBmp = new Bitmap(ClassUtils.CreatInstance("asset.game.rulingAsset"));
         this._lastBuffBmp = new Sprite();
         this._nowBuffBmp = new Sprite();
         this._lastBuffBmpData = ClassUtils.CreatInstance("asset.game.rulingGrayStripAsset");
         this._nowBuffBmpData = ClassUtils.CreatInstance("asset.game.rulingLightStripAsset");
         this._slider = new Bitmap(ClassUtils.CreatInstance("asset.game.rulingBtnAsset"));
         this._lastBuffBmp.x = this._nowBuffBmp.x = this._rulingBmp.x = this.RULING_X;
         this._lastBuffBmp.y = this._nowBuffBmp.y = this._rulingBmp.y = this.RULING_Y;
         this._energyBg.x = 0;
         this._energyBg.y = 5;
         this._slider.x = this.SLIDER_X;
         this._slider.y = this.SLIDER_Y;
         this._rulingSpr = new Sprite();
         this._rulingSpr.addChild(this._rulingBmp);
         this._rulingSpr.buttonMode = true;
         addChild(this._energyBg);
         addChild(this._nowBuffBmp);
         addChild(this._lastBuffBmp);
         addChild(this._rulingSpr);
         addChild(this._slider);
      }
      
      public function setProgress(val:int, max:int) : void
      {
         var progress:Number = val / max > 1 ? 1 : Number(val / max);
         this._progress = progress;
         var pen:Graphics = this._nowBuffBmp.graphics;
         pen.clear();
         pen.beginBitmapFill(this._nowBuffBmpData,null,false);
         pen.drawRect(0,0,this.BUFF_WIDTH * progress,this.BUFF_HEIGHT);
         pen.endFill();
      }
      
      public function setLastProgress(val:int, max:int) : void
      {
         var progress:Number = val / max > 1 ? 1 : Number(val / max);
         var pen:Graphics = this._lastBuffBmp.graphics;
         pen.clear();
         pen.beginBitmapFill(this._lastBuffBmpData,null,false);
         pen.drawRect(0,0,this.BUFF_WIDTH * progress,this.BUFF_HEIGHT);
         pen.endFill();
      }
      
      public function set canShoot(boo:Boolean) : void
      {
         this._canShoot = boo;
      }
      
      private function _addEvent() : void
      {
         KeyManager.Instance.addEventListener(GameKeyEvent.KEY_DOWN,this._keyDown);
         KeyManager.Instance.addEventListener(GameKeyEvent.KEY_UP,this._keyUp);
         this._self.addEventListener(LivingEvent.AttackChanged,this.__attackChanged);
         this._rulingSpr.addEventListener(MouseEvent.CLICK,this._clickSliderSpr);
      }
      
      private function _clickSliderSpr(e:MouseEvent) : void
      {
         this._slider.x = this._rulingSpr.stage.mouseX - this.x + this.SLIDER_X - this.RULING_X + 2;
         trace(this._rulingSpr.stage.mouseX,this._rulingSpr.stage.mouseY);
      }
      
      private function __attackChanged(event:Event) : void
      {
         if(this._self.isAttacking)
         {
            this.canShoot = this._self.isAttacking;
         }
         else
         {
            this._drawRecord();
         }
      }
      
      private function _drawRecord() : void
      {
         this.setLastProgress(this._progress * 100,100);
         this.setProgress(0,100);
      }
      
      private function _removeEvent() : void
      {
         KeyManager.Instance.removeEventListener(GameKeyEvent.KEY_DOWN,this._keyDown);
         KeyManager.Instance.removeEventListener(GameKeyEvent.KEY_UP,this._keyUp);
      }
      
      private function _keyDown(e:GameKeyEvent) : void
      {
         if(this._canShoot && !this.hasEventListener(Event.ENTER_FRAME) && e.charCode == Keyboard.SPACE)
         {
            this._nowVol = 0;
            this._speed = 1;
            this.addEventListener(Event.ENTER_FRAME,this._inThisFrame);
            SelfMarkManager.instance.pause();
         }
      }
      
      private function _keyUp(e:GameKeyEvent) : void
      {
         if(e.charCode == Keyboard.SPACE)
         {
            this.removeEventListener(Event.ENTER_FRAME,this._inThisFrame);
            SoundManager.instance.stop("020");
            if(StepManager.Instance.nowStep == StepManager.Instance.STEPV)
            {
               this.fire((this._progress + 0.03) * FORCE_MAX);
            }
            else
            {
               this.fire(this._progress * FORCE_MAX);
            }
         }
      }
      
      private function _inThisFrame(e:Event) : void
      {
         if(this._nowVol <= 0)
         {
            this._nowVol = 0;
            this._speed = 1;
         }
         else if(this._nowVol >= this._maxVol)
         {
            this._nowVol = this._maxVol;
            this._speed = -1;
         }
         this._nowVol += this._speed;
         SoundManager.instance.play("020",false,false);
         this.setProgress(this._nowVol,this._maxVol);
      }
      
      private function fire(force:int) : void
      {
         GameManager.Instance.shoot(this._self,force);
      }
      
      public function dispose() : void
      {
         if(Boolean(this._energyBg.bitmapData))
         {
            this._energyBg.bitmapData.dispose();
         }
         if(Boolean(this._energyBg.parent))
         {
            this._energyBg.parent.removeChild(this._energyBg);
         }
         if(Boolean(this._lastBuffBmp))
         {
            this._lastBuffBmp.parent.removeChild(this._lastBuffBmp);
         }
         if(Boolean(this._nowBuffBmp))
         {
            this._nowBuffBmp.parent.removeChild(this._nowBuffBmp);
         }
         if(Boolean(this._rulingBmp.bitmapData))
         {
            this._rulingBmp.bitmapData.dispose();
         }
         if(Boolean(this._rulingBmp.parent))
         {
            this._rulingBmp.parent.removeChild(this._rulingBmp);
         }
         if(Boolean(this._slider.bitmapData))
         {
            this._slider.bitmapData.dispose();
         }
         if(Boolean(this._slider.parent))
         {
            this._slider.parent.removeChild(this._slider);
         }
         if(Boolean(this._rulingSpr) && Boolean(this._rulingSpr.parent))
         {
            this._rulingSpr.parent.removeChild(this._rulingSpr);
         }
         if(Boolean(this._lastBuffBmpData))
         {
            this._lastBuffBmpData.dispose();
         }
         if(Boolean(this._nowBuffBmpData))
         {
            this._nowBuffBmpData.dispose();
         }
         this._energyBg = null;
         this._lastBuffBmp = null;
         this._nowBuffBmp = null;
         this._rulingBmp = null;
         this._slider = null;
         this._lastBuffBmpData = null;
         this._nowBuffBmpData = null;
         this._rulingSpr = null;
         if(Boolean(this.parent))
         {
            this.parent.removeChild(this);
         }
      }
   }
}

