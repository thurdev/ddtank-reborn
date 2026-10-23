package road7th.game.left
{
   import com.pickgliss.ui.core.Disposeable;
   import flash.display.GradientType;
   import flash.display.Graphics;
   import flash.display.Sprite;
   import flash.filters.GlowFilter;
   import flash.geom.Matrix;
   import flash.text.TextField;
   import flash.text.TextFormat;
   import road7th.game.model.Living;
   import road7th.utils.TeamUtils;
   
   public class LivingTitleBar extends Sprite implements Disposeable
   {
      
      private static const w:int = 180;
      
      private static const h:int = 20;
      
      private static const ellipse:int = 6;
      
      private var _living:Living;
      
      private var _textField:TextField;
      
      private var _color:int;
      
      public function LivingTitleBar(living:Living)
      {
         this._living = living;
         super();
         this._color = TeamUtils.getTeamColor(living.team);
         this.configUI();
         mouseEnabled = false;
         mouseChildren = false;
      }
      
      private function configUI() : void
      {
         var format:TextFormat = new TextFormat("Arial",12,16777215);
         this._textField = new TextField();
         this._textField.defaultTextFormat = format;
         this._textField.filters = [new GlowFilter(0,1,4,4,8)];
         this._textField.text = this._living.name;
         this._textField.x = 2;
         this._textField.autoSize = "left";
         addChild(this._textField);
         this.drawBackground();
      }
      
      public function dispose() : void
      {
         if(Boolean(this._textField) && Boolean(this._textField.parent))
         {
            this._textField.parent.removeChild(this._textField);
         }
         if(Boolean(parent))
         {
            parent.removeChild(this);
         }
      }
      
      private function drawBackground() : void
      {
         var pen:Graphics = graphics;
         var mat:Matrix = new Matrix();
         mat.createGradientBox(w,h);
         pen.beginGradientFill(GradientType.LINEAR,[this._color,this._color],[1,0],[0,255],mat);
         pen.moveTo(0,h);
         pen.lineTo(0,ellipse);
         pen.curveTo(0,0,ellipse,0);
         pen.lineTo(w,0);
         pen.lineTo(w,h);
         pen.endFill();
      }
   }
}

