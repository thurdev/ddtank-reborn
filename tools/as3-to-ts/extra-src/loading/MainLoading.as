package loading
{
   import asset.loading.MainLoadingAsset;
   import com.greensock.TweenLite;
   import com.greensock.easing.Sine;
   import com.pickgliss.toplevel.StageReferance;
   import com.pickgliss.ui.core.Disposeable;
   import flash.display.Shape;
   import flash.display.Sprite;
   import flash.events.Event;
   import hamster.GameMainState;
   
   [Event(name="complete",type="flash.events.Event")]
   public class MainLoading extends Sprite implements Disposeable
   {
      
      private var _asset:Sprite;
      
      private var hammer:GameMainState;
      
      private var _blackShape:Shape;
      
      private var _progress:int;
      
      public function MainLoading()
      {
         super();
         this._asset = new MainLoadingAsset();
         addChild(this._asset);
         this.drawBlackShape();
         this.initHamster();
      }
      
      private function initHamster() : void
      {
         this.hammer = new GameMainState();
         this.hammer.x = 220;
         this.hammer.y = 75;
         this.hammer.scaleX = this.hammer.scaleY = 0.85;
         addChild(this.hammer);
      }
      
      private function drawBlackShape() : void
      {
         this._blackShape = new Shape();
         this._blackShape.graphics.beginFill(0,1);
         this._blackShape.graphics.drawRect(0,0,StageReferance.stageWidth,StageReferance.stageHeight);
         this._blackShape.graphics.endFill();
      }
      
      private function removeEvent() : void
      {
      }
      
      public function set progress(pg:int) : void
      {
         var p:int = 0;
         if(this._asset == null)
         {
            return;
         }
         if(this._progress == pg)
         {
            this._asset["progressTxt"].text = this.frame + "%";
            if(this.frame >= this.getnextProgress())
            {
               this._asset["progressItem"].stop();
            }
            return;
         }
         if(pg < 0)
         {
            pg = 0;
         }
         else if(p > 100)
         {
            pg == 100;
         }
         this._progress = pg;
         var n:int = 1;
         p = 0;
         var name:String = "";
         if(this._progress <= 40)
         {
            name = "File Game";
            p = this._progress / 40 * 100;
         }
         else if(this._progress < 75)
         {
            name = "File hệ thống";
            p = this._progress % 5 / 5 * 100;
            if(p > 0)
            {
               p += this.random();
            }
            n = (this._progress - 40) / 5 + 2;
         }
         else if(this._progress < 99)
         {
            name = "Bản mẫu";
            p = this._progress % 5 / 5 * 100;
            if(p > 0)
            {
               p += this.random();
            }
            n = (this._progress - 75) / 5 + 9;
         }
         else
         {
            name = "Bản mẫu";
            p = 100;
            n = Loading.LOADER_TOTAL_NUM;
         }
         this._asset["loaderinfoTxt"].text = "Đang tải" + "[" + name + "]" + ":   " + (n > 9 ? "" : " ") + n + "/" + Loading.LOADER_TOTAL_NUM;
         this._asset["progressTxt"].text = p + "%";
         this._asset["progressItem"].gotoAndPlay(p);
         if(this._progress >= 99)
         {
            this._asset["progressItem"].gotoAndStop(100);
         }
      }
      
      private function random() : int
      {
         return Math.random() * 4 - 8;
      }
      
      private function getnextProgress() : int
      {
         var p:int = 0;
         if(this._progress <= 40)
         {
            p = this._progress / 40 * 100 + 2;
         }
         else if(this._progress < 75)
         {
            p = this._progress % 5 / 5 * 100 + 16;
            if(p > 0)
            {
               p += this.random();
            }
         }
         else if(this._progress < 99)
         {
            p = this._progress % 5 / 5 * 100 + 16;
            if(p > 0)
            {
               p += this.random();
            }
         }
         else
         {
            p = 100;
         }
         return p;
      }
      
      public function get progress() : int
      {
         return this._progress;
      }
      
      public function set frame(value:int) : void
      {
         this._asset["progressItem"].gotoAndStop(value);
      }
      
      public function get frame() : int
      {
         return this._asset["progressItem"].currentFrame;
      }
      
      public function get clearCacheBtn() : Sprite
      {
         return this._asset["clearCacheBtn"];
      }
      
      public function dispose() : void
      {
         TweenLite.killTweensOf(this._blackShape);
         if(Boolean(this.hammer) && Boolean(this.hammer.parent))
         {
            this.hammer.dispose();
         }
         this.hammer = null;
         this._blackShape = null;
         if(Boolean(parent))
         {
            parent.removeChild(this);
         }
         removeChild(this._asset);
         this.removeEvent();
         this._asset = null;
      }
      
      public function hide() : void
      {
         this._blackShape.alpha = 0;
         addChild(this._blackShape);
         TweenLite.to(this._blackShape,1,{
            "alpha":1,
            "onComplete":this.onhideOver,
            "ease":Sine.easeIn
         });
      }
      
      public function show() : void
      {
         TweenLite.to(this._blackShape,1,{
            "alpha":1,
            "onComplete":this.onShowOver,
            "ease":Sine.easeIn
         });
      }
      
      private function onhideOver() : void
      {
         dispatchEvent(new Event(Event.COMPLETE));
      }
      
      private function onShowOver() : void
      {
         this.dispose();
      }
   }
}

