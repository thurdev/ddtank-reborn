package road7th.game.view.goods
{
   import flash.display.MovieClip;
   import phy.object.PhysicalObj;
   import road7th.Trainer;
   import road7th.utils.ClassUtils;
   
   public class TrainerEquip extends PhysicalObj
   {
      
      private var _equipAsset:MovieClip;
      
      public function TrainerEquip(id:int = 100001, layerType:int = 1, mass:Number = 1, gravityFactor:Number = 1, windFactor:Number = 1, airResitFactor:Number = 1)
      {
         super(id,layerType,mass,gravityFactor,windFactor,airResitFactor);
         this.init();
      }
      
      private function init() : void
      {
         if(Trainer.self.sex == "male")
         {
            this._equipAsset = ClassUtils.CreatInstance("asset.trainer.TrainerManEquipAsset");
         }
         else
         {
            this._equipAsset = ClassUtils.CreatInstance("asset.trainer.TrainerWomanEquipAsset");
         }
         addChild(this._equipAsset);
      }
      
      override public function dispose() : void
      {
         if(Boolean(this._equipAsset) && Boolean(this._equipAsset.parent))
         {
            this._equipAsset.parent.removeChild(this._equipAsset);
         }
         this._equipAsset = null;
         super.dispose();
         if(Boolean(parent))
         {
            parent.removeChild(this);
         }
      }
   }
}

