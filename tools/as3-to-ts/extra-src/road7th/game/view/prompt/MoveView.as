package road7th.game.view.prompt
{
   import flash.display.Bitmap;
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import road7th.utils.ClassUtils;
   
   public class MoveView extends Sprite
   {
      
      private var _bg:Bitmap;
      
      private var _tsMc:MovieClip;
      
      private const TS_LEFT:int = 0;
      
      private const TS_RIGHT:int = 1;
      
      public function MoveView(num:int = 0)
      {
         super();
         this._init(num);
      }
      
      private function _init(num:int = 0) : void
      {
         this._bg = new Bitmap(ClassUtils.CreatInstance("asset.trainer.mcMoveBg"));
         if(num == this.TS_LEFT)
         {
            this._tsMc = ClassUtils.CreatInstance("asset.trainer.leftKeyShineAsset");
            this._tsMc.x = 58;
            this._tsMc.y = 45;
         }
         else if(num == this.TS_RIGHT)
         {
            this._tsMc = ClassUtils.CreatInstance("asset.trainer.rightKeyShineAsset");
            this._tsMc.x = 127;
            this._tsMc.y = 45;
         }
         addChild(this._bg);
         addChild(this._tsMc);
         x = 498 - width / 2;
         y = 390 - height;
      }
      
      public function dispose() : void
      {
         if(Boolean(this._bg) && Boolean(this._bg.bitmapData))
         {
            this._bg.bitmapData.dispose();
         }
         if(Boolean(this._bg.parent))
         {
            this._bg.parent.removeChild(this._bg);
         }
         if(Boolean(this._tsMc.parent))
         {
            this._tsMc.parent.removeChild(this._tsMc);
         }
         this._bg = null;
         this._tsMc = null;
         if(Boolean(this.parent))
         {
            this.parent.removeChild(this);
         }
      }
   }
}

