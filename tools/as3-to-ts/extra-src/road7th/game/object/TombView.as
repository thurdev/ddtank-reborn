package road7th.game.object
{
   import phy.object.PhysicalObj;
   
   public class TombView extends PhysicalObj
   {
      
      public function TombView(id:int, layerType:int = 1, mass:Number = 1, gravityFactor:Number = 1, windFactor:Number = 1, airResitFactor:Number = 1)
      {
         super(id,layerType,mass,gravityFactor,windFactor,airResitFactor);
      }
   }
}

