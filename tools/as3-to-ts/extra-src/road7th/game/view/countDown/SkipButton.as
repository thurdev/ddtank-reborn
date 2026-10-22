package road7th.game.view.countDown
{
   import flash.display.Bitmap;
   import flash.display.Sprite;
   import flash.events.MouseEvent;
   import road7th.utils.ClassUtils;
   
   public class SkipButton extends Sprite
   {
      
      private var _bg:Bitmap;
      
      private var _eff:Bitmap;
      
      public function SkipButton()
      {
         super();
         this._init();
         this._addEvent();
      }
      
      private function _init() : void
      {
         this._bg = new Bitmap(ClassUtils.CreatInstance("asset.game.mark.SkipBack"));
         this._eff = new Bitmap(ClassUtils.CreatInstance("asset.game.mark.SkipShine"));
         addChild(this._bg);
         addChild(this._eff);
         this._bg.x = 4;
         this._bg.y = 4;
         this._eff.visible = false;
         this.buttonMode = true;
      }
      
      private function _addEvent() : void
      {
         this.addEventListener(MouseEvent.MOUSE_OVER,this._thisOver);
         this.addEventListener(MouseEvent.MOUSE_OUT,this._thisOut);
      }
      
      private function _thisOver(e:MouseEvent) : void
      {
         this._eff.visible = true;
      }
      
      private function _thisOut(e:MouseEvent) : void
      {
         this._eff.visible = false;
      }
      
      public function dispose() : void
      {
         this.removeEventListener(MouseEvent.MOUSE_OVER,this._thisOver);
         this.removeEventListener(MouseEvent.MOUSE_OUT,this._thisOut);
         if(Boolean(this._bg.bitmapData))
         {
            this._bg.bitmapData.dispose();
         }
         if(Boolean(this._eff.bitmapData))
         {
            this._bg.bitmapData.dispose();
         }
         if(Boolean(this._bg.parent))
         {
            this._bg.parent.removeChild(this._bg);
         }
         if(Boolean(this._eff.parent))
         {
            this._eff.parent.removeChild(this._eff);
         }
         this._bg = null;
         this._eff = null;
         if(Boolean(this.parent))
         {
            this.parent.removeChild(this);
         }
      }
   }
}

