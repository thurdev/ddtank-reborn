package hamster.events
{
   import flash.events.Event;
   
   public class GameEvent extends Event
   {
      
      public static const STATE_CHANGE:String = "stateChange";
      
      public static const GAME_PLAY:String = "gamePlay";
      
      public static const HIT_ADDSCORE:String = "hitAddScore";
      
      public static const QUICKEN:String = "quicken";
      
      private var _paras:Array;
      
      public function GameEvent(type:String, ... args)
      {
         super(type);
         this._paras = args;
      }
      
      public function get paras() : Array
      {
         return this._paras;
      }
   }
}

