package road7th.game.view.living
{
   import com.pickgliss.ui.ComponentFactory;
   import com.pickgliss.ui.core.Disposeable;
   import flash.display.Bitmap;
   import flash.display.Graphics;
   import flash.display.Shape;
   import flash.display.Sprite;
   
   public class EnergyBar extends Sprite implements Disposeable
   {
      
      private static const color:int = 65280;
      
      private var _progress:Number = 1;
      
      private var _w:int = 40;
      
      private var _h:int = 4;
      
      private var _bg:Bitmap;
      
      private var _energy:Shape;
      
      public function EnergyBar()
      {
         super();
         this._bg = ComponentFactory.Instance.creatBitmap("asset.game.moveStripBgAsset");
         addChild(this._bg);
         this._energy = new Shape();
         addChild(this._energy);
         this.drawBackground();
      }
      
      private function drawBackground() : void
      {
         var pen:Graphics = this._energy.graphics;
         pen.clear();
         pen.beginFill(color);
         pen.drawRect(-19,-1,(this._w - 2) * this._progress,this._h - 2);
         pen.endFill();
      }
      
      public function setProgress(progress:Number) : void
      {
         this._progress = progress > 0 ? Number(progress) : Number(0.01);
         this.drawBackground();
      }
      
      public function dispose() : void
      {
      }
   }
}

