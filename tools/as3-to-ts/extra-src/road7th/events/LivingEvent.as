package road7th.events
{
   import flash.events.Event;
   
   public class LivingEvent extends Event
   {
      
      public static const MoveTo:String = "moveTo";
      
      public static const ShootPreparedChanged:String = "shootPreparedChanged";
      
      public static const ShootingChanged:String = "shootingChanged";
      
      public static const Shoot:String = "shoot";
      
      public static const DirectionChanged:String = "directionChanged";
      
      public static const EnergyChanged:String = "energyChanged";
      
      public static const BloodChanged:String = "bloodChanged";
      
      public static const PosChanged:String = "posChanged";
      
      public static const AttackChanged:String = "attackChanged";
      
      public static const HiddenChanged:String = "hiddenChanged";
      
      public static const BeginShoot:String = "beginShoot";
      
      public static const SendShootAction:String = "sendShootAction";
      
      public static const AngleChanged:String = "angleChanged";
      
      public static const Dress:String = "dress";
      
      public static const PLAY_MOVIE:String = "playmovie";
      
      private var _val:Number;
      
      private var _old:Number;
      
      private var _params:Array;
      
      public function LivingEvent(type:String, value:Number = 0, old:Number = 0, ... arg)
      {
         this._val = value;
         this._old = old;
         this._params = arg;
         super(type);
      }
      
      public function get value() : Number
      {
         return this._val;
      }
      
      public function get old() : Number
      {
         return this._old;
      }
      
      public function get params() : Array
      {
         return this._params;
      }
   }
}

