package road7th.game.view.countDown
{
   import com.greensock.TweenLite;
   import flash.display.Bitmap;
   import flash.display.Sprite;
   import flash.events.MouseEvent;
   import flash.events.TimerEvent;
   import flash.filters.BlurFilter;
   import flash.utils.Timer;
   import road7th.manager.GameManager;
   import road7th.manager.SoundManager;
   import road7th.utils.ClassUtils;
   
   public class SelfMarkBar extends Sprite
   {
      
      private var _numsUrl:Vector.<String>;
      
      private var _numView:Sprite;
      
      private var _time:Timer;
      
      private var _numID:int;
      
      private var _animateFilter:BlurFilter;
      
      private var _skipBt:SkipButton;
      
      private var _bmp1:Bitmap;
      
      private var _bmp2:Bitmap;
      
      public function SelfMarkBar()
      {
         super();
         this._init();
         this._addEvent();
      }
      
      private function _init() : void
      {
         this._numsUrl = new Vector.<String>();
         this._numsUrl[0] = "asset.game.mark.Red0";
         this._numsUrl[1] = "asset.game.mark.Red1";
         this._numsUrl[2] = "asset.game.mark.Red2";
         this._numsUrl[3] = "asset.game.mark.Red3";
         this._numsUrl[4] = "asset.game.mark.Red4";
         this._numsUrl[5] = "asset.game.mark.Blue5";
         this._numsUrl[6] = "asset.game.mark.Blue6";
         this._numsUrl[7] = "asset.game.mark.Blue7";
         this._numsUrl[8] = "asset.game.mark.Blue8";
         this._numsUrl[9] = "asset.game.mark.Blue9";
         this._numsUrl[10] = "asset.game.mark.Blue1,asset.game.mark.Blue0";
         this._numsUrl[11] = "asset.game.mark.Blue1,asset.game.mark.Blue1";
         this._numsUrl[12] = "asset.game.mark.Blue1,asset.game.mark.Blue2";
         this._numsUrl[13] = "asset.game.mark.Blue1,asset.game.mark.Blue3";
         this._numsUrl[14] = "asset.game.mark.Blue1,asset.game.mark.Blue4";
         this._numsUrl[15] = "asset.game.mark.Blue1,asset.game.mark.Blue5";
         this._numView = new Sprite();
         this._animateFilter = new BlurFilter();
         addChild(this._numView);
         this._skipBt = new SkipButton();
         this._skipBt.x = -this._skipBt.width / 2;
         this._skipBt.y = 35;
         addChild(this._skipBt);
      }
      
      private function _addEvent() : void
      {
         this._skipBt.addEventListener(MouseEvent.CLICK,this._clickSkipBt);
      }
      
      private function _removeEvent() : void
      {
         this._skipBt.removeEventListener(MouseEvent.CLICK,this._clickSkipBt);
      }
      
      private function _clickSkipBt(e:MouseEvent) : void
      {
         SoundManager.instance.play("008");
         SelfMarkManager.instance.dispose();
         GameManager.Instance.nextTurn();
      }
      
      private function _addNumToView(num:int) : void
      {
         var oldx:Number = NaN;
         var oldy:Number = NaN;
         oldx = NaN;
         oldy = NaN;
         this._numViewDispose();
         var arr:Array = this._numsUrl[num].split(/,/g);
         if(arr.length == 1)
         {
            this._bmp1 = new Bitmap(ClassUtils.CreatInstance(arr[0]));
            this._numView.addChild(this._bmp1);
         }
         else if(arr.length == 2)
         {
            this._bmp1 = new Bitmap(ClassUtils.CreatInstance(arr[0]));
            this._bmp2 = new Bitmap(ClassUtils.CreatInstance(arr[1]));
            this._numView.addChild(this._bmp1);
            this._numView.addChild(this._bmp2);
            this._bmp2.x = this._bmp1.width;
         }
         this._numView.x = -this._numView.width / 2;
         this._numView.y = -this._numView.height / 2;
         if(num <= 4)
         {
            oldx = this._numView.x;
            oldy = this._numView.y;
            this._numView.scaleY = 2;
            this._numView.scaleX = 2;
            this._numView.x = -this._numView.width / 2;
            this._numView.y = -this._numView.height / 2;
            TweenLite.to(this._numView,0.2,{
               "x":oldx,
               "y":oldy,
               "scaleX":1,
               "scaleY":1
            });
            SoundManager.instance.stop("067");
            SoundManager.instance.play("067");
         }
         else
         {
            SoundManager.instance.play("014");
         }
      }
      
      public function showNum() : void
      {
         this._numID = 15;
         this._addNumToView(this._numID);
         this._animateFilter.blurX = 40;
         this._numView.filters = [this._animateFilter];
         TweenLite.to(this._animateFilter,0.3,{
            "blurX":0,
            "onUpdate":this.tweenRender,
            "onComplete":this.tweenComplete
         });
         this._time = new Timer(1000,0);
         this._time.addEventListener(TimerEvent.TIMER,this._mark);
         this._time.start();
      }
      
      public function pause() : void
      {
         this._time.stop();
      }
      
      private function tweenRender() : void
      {
         if(!this._numView)
         {
            return;
         }
         this._numView.filters = [this._animateFilter];
      }
      
      private function tweenComplete() : void
      {
         if(!this._numView)
         {
            return;
         }
         this._numView.filters = null;
      }
      
      private function _mark(e:TimerEvent) : void
      {
         if(this._numID < 0)
         {
            SelfMarkManager.instance.dispose();
            GameManager.Instance.nextTurn();
            return;
         }
         this._addNumToView(this._numID);
         this._numID -= 1;
      }
      
      public function dispose() : void
      {
         this._removeEvent();
         this._time.stop();
         this._time.removeEventListener(TimerEvent.TIMER,this._mark);
         this._time = null;
         this._numViewDispose();
         if(Boolean(this._numView.parent))
         {
            this._numView.parent.removeChild(this._numView);
         }
         this._numView = null;
         if(Boolean(this._skipBt))
         {
            this._skipBt.dispose();
         }
         this._skipBt = null;
         this._animateFilter = null;
         if(Boolean(this.parent))
         {
            this.parent.removeChild(this);
         }
      }
      
      private function _numViewDispose() : void
      {
         if(Boolean(this._bmp1) && Boolean(this._bmp1.bitmapData))
         {
            this._bmp1.bitmapData.dispose();
         }
         if(Boolean(this._bmp2) && Boolean(this._bmp2.bitmapData))
         {
            this._bmp2.bitmapData.dispose();
         }
         var num:int = this._numView.numChildren;
         for(var i:int = 0; i < num; i++)
         {
            this._numView.removeChild(this._numView.getChildAt(0));
         }
      }
   }
}

