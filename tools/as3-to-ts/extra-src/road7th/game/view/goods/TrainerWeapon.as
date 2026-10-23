package road7th.game.view.goods
{
   import flash.display.MovieClip;
   import phy.object.PhysicalObj;
   import road7th.utils.ClassUtils;
   
   public class TrainerWeapon extends PhysicalObj
   {
      
      private var _weaponAsset:MovieClip;
      
      public function TrainerWeapon(id:int = 100001, layerType:int = 1, mass:Number = 1, gravityFactor:Number = 1, windFactor:Number = 1, airResitFactor:Number = 1)
      {
         super(id,layerType,mass,gravityFactor,windFactor,airResitFactor);
         this.init();
      }
      
      private function init() : void
      {
         this._weaponAsset = ClassUtils.CreatInstance("asset.trainer.TrainerWeaponAsset");
         addChild(this._weaponAsset);
      }
      
      override public function dispose() : void
      {
         if(Boolean(this._weaponAsset) && Boolean(this._weaponAsset.parent))
         {
            this._weaponAsset.parent.removeChild(this._weaponAsset);
         }
         this._weaponAsset = null;
         super.dispose();
         if(Boolean(parent))
         {
            parent.removeChild(this);
         }
      }
   }
}

