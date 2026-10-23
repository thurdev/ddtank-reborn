package road7th.game.view.smallMap
{
   import flash.display.BitmapData;
   import flash.display.Graphics;
   import flash.display.Shape;
   import flash.geom.Matrix;
   import road7th.utils.ClassUtils;
   
   public class BackBar extends Shape
   {
      
      private var _back1:BitmapData;
      
      private var _back2:BitmapData;
      
      private var _back3:BitmapData;
      
      private var _thisWidth:int;
      
      public function BackBar(w:int)
      {
         this._thisWidth = w;
         super();
         this._init();
         this.draw();
      }
      
      private function _init() : void
      {
         this._back1 = ClassUtils.CreatInstance("asset.game.smallmap.TitleBack1");
         this._back2 = ClassUtils.CreatInstance("asset.game.smallmap.TitleBack2");
         this._back3 = ClassUtils.CreatInstance("asset.game.smallmap.TitleBack3");
      }
      
      private function draw() : void
      {
         var pen:Graphics = graphics;
         pen.clear();
         pen.beginBitmapFill(this._back1,null,true,true);
         pen.drawRect(0,0,this._back1.width,this._back1.height);
         pen.endFill();
         pen.beginBitmapFill(this._back2,null,true,true);
         pen.drawRect(this._back1.width,0,this._thisWidth - this._back1.width - this._back3.width,this._back1.height);
         pen.endFill();
         var drawmatrix:Matrix = new Matrix();
         drawmatrix.tx = this._thisWidth - this._back3.width;
         pen.beginBitmapFill(this._back3,drawmatrix,true,true);
         pen.drawRect(this._thisWidth - this._back3.width,0,this._back3.width,this._back1.height);
         pen.endFill();
      }
      
      override public function set width(value:Number) : void
      {
         this._thisWidth = value;
         this.draw();
      }
   }
}

