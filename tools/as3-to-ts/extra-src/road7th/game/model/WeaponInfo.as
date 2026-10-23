package road7th.game.model
{
   public class WeaponInfo
   {
      
      private var _armMaxAngle:Number;
      
      private var _armMinAngle:Number = 30;
      
      public function WeaponInfo()
      {
         super();
      }
      
      public function get armMaxAngle() : Number
      {
         return this._armMaxAngle;
      }
      
      public function set armMaxAngle(value:Number) : void
      {
         if(this._armMaxAngle == value)
         {
            return;
         }
         this._armMaxAngle = value;
      }
      
      public function get armMinAngle() : Number
      {
         return this._armMinAngle;
      }
      
      public function set armMinAngle(value:Number) : void
      {
         if(this._armMinAngle == value)
         {
            return;
         }
         this._armMinAngle = value;
      }
   }
}

