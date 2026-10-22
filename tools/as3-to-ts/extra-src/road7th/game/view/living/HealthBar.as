package road7th.game.view.living
{
   import com.pickgliss.ui.core.Disposeable;
   import flash.display.Graphics;
   import flash.display.Shape;
   
   public class HealthBar extends Shape implements Disposeable
   {
      
      private var _color:int;
      
      public function HealthBar(color:int)
      {
         super();
         this._color = color;
         this.drawBackground();
      }
      
      private function drawBackground() : void
      {
         var pen:Graphics = graphics;
         pen.clear();
         pen.beginFill(this._color);
         pen.lineStyle(1,16777215);
         pen.drawRect(1,1,40,6);
         pen.endFill();
      }
      
      public function drawByNum(num:Number) : void
      {
         graphics.clear();
         var pen:Graphics = graphics;
         pen.clear();
         pen.beginFill(this._color);
         pen.drawRect(1,1,40 * num,6);
         pen.endFill();
         pen.beginFill(16777215);
         pen.drawRect(40 * num + 1,1,40 * (1 - num),6);
         pen.endFill();
         pen.lineStyle(1,16777215);
         pen.drawRect(1,1,40,6);
         pen.endFill();
      }
      
      public function dispose() : void
      {
      }
   }
}

