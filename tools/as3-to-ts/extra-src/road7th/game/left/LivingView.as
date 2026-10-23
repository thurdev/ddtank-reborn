package road7th.game.left
{
   import com.pickgliss.ui.core.Disposeable;
   import com.pickgliss.utils.ObjectUtils;
   import flash.display.BitmapData;
   import flash.display.Graphics;
   import flash.display.MovieClip;
   import flash.display.Shape;
   import flash.display.Sprite;
   import flash.events.Event;
   import road7th.game.model.Living;
   import road7th.utils.ClassUtils;
   
   public class LivingView extends Sprite implements Disposeable
   {
      
      private var _living:Living;
      
      private var _movie:MovieClip;
      
      private var _livingShape:Shape;
      
      private var _title:LivingTitleBar;
      
      public function LivingView(living:Living)
      {
         this._living = living;
         super();
         this.configUI();
         this.drawLiving();
      }
      
      private function configUI() : void
      {
         this._movie = ClassUtils.CreatInstance("asset.game.LeftPlayerCiteAssetT");
         addChild(this._movie);
         this._livingShape = new Shape();
         this._livingShape.y = -5;
         this._movie["leftCite"].addChild(this._livingShape);
         this._title = new LivingTitleBar(this._living);
         this._movie["leftCite"].addChild(this._title);
      }
      
      public function enter() : void
      {
         this._movie.gotoAndPlay("in");
      }
      
      public function leaving() : void
      {
         this._movie.addEventListener(Event.ENTER_FRAME,this.__frame);
         this._movie.gotoAndPlay("out");
      }
      
      private function __frame(event:Event) : void
      {
         if(this._movie.currentFrame >= this._movie.totalFrames)
         {
            this.stop();
         }
      }
      
      private function stop() : void
      {
         this._movie.removeEventListener(Event.ENTER_FRAME,this.__frame);
         this.dispose();
      }
      
      private function drawLiving() : void
      {
         var shot:BitmapData = this._living.shot;
         var pen:Graphics = this._livingShape.graphics;
         pen.clear();
         pen.beginBitmapFill(shot);
         pen.drawRect(0,0,shot.width,shot.height);
         pen.endFill();
      }
      
      public function dispose() : void
      {
         ObjectUtils.disposeObject(this._livingShape);
         this._livingShape = null;
         ObjectUtils.disposeObject(this._title);
         this._title = null;
         ObjectUtils.disposeObject(this._movie);
         this._movie = null;
         this._living = null;
         if(Boolean(parent))
         {
            parent.removeChild(this);
         }
      }
   }
}

