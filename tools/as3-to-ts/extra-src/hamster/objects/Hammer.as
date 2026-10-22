package hamster.objects
{
   import asset.hamster.HammerAsset;
   import com.pickgliss.ui.core.Disposeable;
   import com.pickgliss.utils.ObjectUtils;
   import flash.display.MovieClip;
   import flash.display.Sprite;
   
   public class Hammer extends Sprite implements Disposeable
   {
      
      private var _asset:MovieClip;
      
      public function Hammer()
      {
         super();
         this.initView();
      }
      
      private function initView() : void
      {
         this._asset = MovieClip(new HammerAsset().getChildAt(0));
         this._asset.stop();
         addChild(this._asset);
         x = mouseX;
         y = mouseY;
      }
      
      public function attack() : void
      {
         if(Boolean(this._asset))
         {
            this._asset.gotoAndPlay("attack");
         }
      }
      
      public function dispose() : void
      {
         if(Boolean(this._asset))
         {
            ObjectUtils.disposeObject(this._asset);
         }
         this._asset = null;
         if(Boolean(parent))
         {
            parent.removeChild(this);
         }
      }
   }
}

