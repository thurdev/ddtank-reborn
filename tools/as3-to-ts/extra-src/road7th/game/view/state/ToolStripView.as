package road7th.game.view.state
{
   import flash.display.Bitmap;
   import flash.display.Sprite;
   import road7th.game.model.LocalPlayer;
   import road7th.utils.ClassUtils;
   
   public class ToolStripView extends Sprite
   {
      
      private var _bg:Bitmap;
      
      private var _bloodStrip:BloodStrip;
      
      private var _powerStrip:PowerStrip;
      
      private var _self:LocalPlayer;
      
      private const BLOOD_X:int = 5;
      
      private const BLOOD_Y:int = 22;
      
      private const POWER_X:int = 6;
      
      private const POWER_Y:int = 5;
      
      public function ToolStripView(self:LocalPlayer)
      {
         super();
         this._self = self;
         this._buildUI();
      }
      
      private function _buildUI() : void
      {
         this._bg = new Bitmap(ClassUtils.CreatInstance("asset.game.health.back"));
         addChild(this._bg);
         this._bloodStrip = new BloodStrip(this._self);
         this._bloodStrip.x = this.BLOOD_X;
         this._bloodStrip.y = this.BLOOD_Y;
         addChild(this._bloodStrip);
         this._bloodStrip.bloodState(this._self.blood,this._self.maxBlood);
         this._powerStrip = new PowerStrip(this._self);
         this._powerStrip.x = this.POWER_X;
         this._powerStrip.y = this.POWER_Y;
         addChild(this._powerStrip);
         this._powerStrip.powerState(100,100);
      }
      
      public function changePower(nowBlood:int, maxBlood:int) : void
      {
         this._powerStrip.powerState(nowBlood,maxBlood);
      }
      
      public function changeHP(nowBlood:int, maxBlood:int) : void
      {
         this._bloodStrip.bloodState(nowBlood,maxBlood);
      }
      
      public function dispose() : void
      {
         if(Boolean(this._bg.bitmapData))
         {
            this._bg.bitmapData.dispose();
         }
         if(Boolean(this._bg.parent))
         {
            this._bg.parent.removeChild(this._bg);
         }
         this._bloodStrip.dispose();
         this._powerStrip.dispose();
         this._bg = null;
         this._bloodStrip = null;
         this._powerStrip = null;
         if(Boolean(this.parent))
         {
            this.parent.removeChild(this);
         }
      }
   }
}

