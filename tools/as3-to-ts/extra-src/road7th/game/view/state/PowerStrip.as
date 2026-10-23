package road7th.game.view.state
{
   import flash.display.Bitmap;
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.geom.Point;
   import road7th.events.LivingEvent;
   import road7th.game.model.LocalPlayer;
   import road7th.game.view.prompt.PromptManager;
   import road7th.utils.ClassUtils;
   
   public class PowerStrip extends Sprite
   {
      
      private var _powerStrip:Bitmap;
      
      private var _powerMask:Sprite;
      
      private var _powerEff:MovieClip;
      
      private var _self:LocalPlayer;
      
      private var _showNotMana:Boolean = true;
      
      public function PowerStrip(self:LocalPlayer)
      {
         super();
         this._self = self;
         this._initUI();
         this._addEvt();
      }
      
      private function _initUI() : void
      {
         this._powerStrip = new Bitmap(ClassUtils.CreatInstance("asset.game.energy.back"));
         this._powerEff = ClassUtils.CreatInstance("asset.game.powerStripLightAssetII");
         this._powerMask = this._drawMask(this._powerStrip.width,this._powerStrip.height);
         addChild(this._powerStrip);
         addChild(this._powerEff);
         addChild(this._powerMask);
         this._powerStrip.mask = this._powerMask;
      }
      
      private function _drawMask(w:Number, h:Number) : Sprite
      {
         var sp:Sprite = new Sprite();
         sp.graphics.beginFill(0,0);
         sp.graphics.drawRect(0,0,w,h);
         sp.graphics.endFill();
         return sp;
      }
      
      public function powerState(nowBlood:int, maxBlood:int) : void
      {
         this._powerMask.width = nowBlood / maxBlood * this._powerStrip.width;
         this._powerMask.x = this._powerStrip.width - this._powerMask.width;
         this._powerEff.visible = nowBlood == maxBlood ? false : Boolean(true);
         if(this._showNotMana && nowBlood < maxBlood * 0.1)
         {
            this._showNotMana = false;
            addChild(PromptManager.Instance.build(PromptManager.Instance.SHOW_NOTENOGH_MANA,true,new Point(-52,-154)));
         }
      }
      
      private function _addEvt() : void
      {
         this._self.addEventListener(LivingEvent.EnergyChanged,this._energyChanged);
      }
      
      private function _removeEvt() : void
      {
         this._self.removeEventListener(LivingEvent.EnergyChanged,this._energyChanged);
      }
      
      private function _energyChanged(e:LivingEvent) : void
      {
         this.powerState(this._self.energy,1000);
      }
      
      public function dispose() : void
      {
         if(Boolean(this._powerStrip.bitmapData))
         {
            this._powerStrip.bitmapData.dispose();
         }
         if(Boolean(this._powerStrip.parent))
         {
            this._powerStrip.parent.removeChild(this._powerStrip);
         }
         if(Boolean(this._powerMask.parent))
         {
            this._powerMask.parent.removeChild(this._powerMask);
         }
         if(Boolean(this._powerEff.parent))
         {
            this._powerEff.parent.removeChild(this._powerEff);
         }
         this._powerStrip = null;
         this._powerMask = null;
         this._powerEff = null;
         if(Boolean(this.parent))
         {
            this.parent.removeChild(this);
         }
      }
   }
}

