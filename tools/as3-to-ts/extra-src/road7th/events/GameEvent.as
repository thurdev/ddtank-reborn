package road7th.events
{
   import flash.events.Event;
   
   public class GameEvent extends Event
   {
      
      public static const NewTurn:String = "newTurn";
      
      public static const CurrentChanged:String = "currentChanged";
      
      public static const GameStart:String = "gameStart";
      
      public static const GameOver:String = "gameOver";
      
      public static const WindChanged:String = "windChanged";
      
      public static const AddLiving:String = "addLiving";
      
      public static const RemoveLiving:String = "removeLiving";
      
      public static const AddBox:String = "addBox";
      
      public static const RemoveBox:String = "removeBox";
      
      public static const HitLiving:String = "hitLiving";
      
      public static const HitSelf:String = "hitSelf";
      
      public static const StateChanged:String = "stateChanged";
      
      private var _val:Number;
      
      private var _old:Number;
      
      private var _params:Array;
      
      public function GameEvent(type:String, value:Number = 0, old:Number = 0, ... arg)
      {
         this._val = value;
         this._old = value;
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

