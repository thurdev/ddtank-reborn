package road7th.game.view.state
{
   import flash.display.Bitmap;
   import flash.display.Sprite;
   import flash.filters.GlowFilter;
   import flash.text.TextField;
   import flash.text.TextFormat;
   import flash.text.TextFormatAlign;
   import road7th.events.LivingEvent;
   import road7th.game.model.LocalPlayer;
   import road7th.utils.ClassUtils;
   
   public class BloodStrip extends Sprite
   {
      
      private var _HPStrip:Bitmap;
      
      private var _HPmask:Sprite;
      
      private var _HPTxt:TextField;
      
      private var _self:LocalPlayer;
      
      public function BloodStrip(self:LocalPlayer)
      {
         super();
         this._self = self;
         this._initUI();
         this._addEvent();
      }
      
      private function _initUI() : void
      {
         this._HPStrip = new Bitmap(ClassUtils.CreatInstance("asset.game.blood.SelfBack"));
         addChild(this._HPStrip);
         this._HPmask = this._drawMask(this._HPStrip.width,this._HPStrip.height);
         this._HPmask.x = this._HPStrip.x;
         this._HPmask.y = this._HPStrip.y - 1;
         addChild(this._HPmask);
         this._HPStrip.mask = this._HPmask;
         this._HPTxt = new TextField();
         this._HPTxt.defaultTextFormat = this._buildFormat();
         this._HPTxt.filters = [this._buildFilter()];
         this._HPTxt.mouseEnabled = false;
         this._HPTxt.width = 46;
         this._HPTxt.height = 18;
         this._HPTxt.x = 40;
         addChild(this._HPTxt);
      }
      
      private function _addEvent() : void
      {
         this._self.addEventListener(LivingEvent.BloodChanged,this._bloodChanged);
      }
      
      private function _bloodChanged(e:LivingEvent) : void
      {
         this.bloodState(this._self.blood,this._self.maxBlood);
      }
      
      private function _drawMask(w:Number, h:Number) : Sprite
      {
         var sp:Sprite = new Sprite();
         sp.graphics.beginFill(0,0);
         sp.graphics.drawRect(0,0,w,h);
         sp.graphics.endFill();
         return sp;
      }
      
      private function _buildFormat() : TextFormat
      {
         var format:TextFormat = new TextFormat();
         format.font = "Arial";
         format.color = 16777215;
         format.size = 12;
         format.bold = true;
         format.align = TextFormatAlign.CENTER;
         return format;
      }
      
      private function _buildFilter() : GlowFilter
      {
         return new GlowFilter(0,1,4,4,10);
      }
      
      public function bloodState(nowBlood:int, maxBlood:int) : void
      {
         this._HPmask.width = nowBlood / maxBlood * this._HPStrip.width;
         this._HPmask.x = this._HPStrip.width - this._HPmask.width;
         this._HPTxt.text = String(nowBlood);
      }
      
      public function dispose() : void
      {
         if(Boolean(this._HPStrip.bitmapData))
         {
            this._HPStrip.bitmapData.dispose();
         }
         if(Boolean(this._HPStrip.parent))
         {
            this._HPStrip.parent.removeChild(this._HPStrip);
         }
         if(Boolean(this._HPmask.parent))
         {
            this._HPmask.parent.removeChild(this._HPmask);
         }
         if(Boolean(this._HPTxt.parent))
         {
            this._HPTxt.parent.removeChild(this._HPTxt);
         }
         this._HPStrip = null;
         this._HPmask = null;
         this._HPTxt = null;
         if(Boolean(this.parent))
         {
            this.parent.removeChild(this);
         }
      }
   }
}

