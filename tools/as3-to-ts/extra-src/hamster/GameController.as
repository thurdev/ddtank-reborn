package hamster
{
   import flash.events.EventDispatcher;
   import hamster.events.GameEvent;
   
   public class GameController extends EventDispatcher
   {
      
      public static const BOGU_LIMIT:int = 8;
      
      public static var POPUP_INDEX:Array = [0,1,2,3,4,5,6,7];
      
      private var _lastPopupIndex:int;
      
      private var _score:int;
      
      public function GameController()
      {
         super();
      }
      
      public function getPopupIndex() : int
      {
         var rand:int = int(Math.random() * POPUP_INDEX.length - 1);
         var popupIdx:int = int(POPUP_INDEX[rand]);
         POPUP_INDEX.splice(rand,1);
         POPUP_INDEX.push(popupIdx);
         return popupIdx;
      }
      
      public function startPlay() : void
      {
         this._score = 0;
         dispatchEvent(new GameEvent(GameEvent.GAME_PLAY));
      }
      
      public function get score() : int
      {
         return this._score;
      }
      
      public function attackAddScore() : void
      {
         ++this._score;
         dispatchEvent(new GameEvent(GameEvent.HIT_ADDSCORE,this._score));
         if(this._score > 2 && this._score % 8 == 1)
         {
            dispatchEvent(new GameEvent(GameEvent.QUICKEN,this._score % 10));
         }
      }
   }
}

