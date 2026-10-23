package hamster.manager
{
   import com.pickgliss.toplevel.StageReferance;
   import flash.events.Event;
   import flash.events.EventDispatcher;
   import flash.utils.getTimer;
   
   public class PopupTimerManager extends EventDispatcher
   {
      
      public static const POPUP_COMPTELE:String = "popupComptele";
      
      public static const POPUP_TIMER:String = "popupTimer";
      
      private var _minBetween:Number;
      
      private var _timeBetween:Number;
      
      private var _nextPopup:Number;
      
      private var _paused:Boolean;
      
      private var _speed:Number;
      
      public function PopupTimerManager(maxBetween:Number, minBetween:Number, speed:Number)
      {
         super();
         this._timeBetween = maxBetween;
         this._minBetween = minBetween;
         this._speed = speed;
      }
      
      public function start() : void
      {
         this._nextPopup = getTimer() + this._timeBetween;
         this._paused = false;
         StageReferance.stage.addEventListener(Event.ENTER_FRAME,this.__enterFrame);
      }
      
      public function pause() : void
      {
         this._paused = true;
      }
      
      public function resume() : void
      {
         this._paused = false;
      }
      
      public function quicken(speed:Number = NaN) : void
      {
         if(isNaN(speed))
         {
            this._timeBetween -= this._speed;
         }
         else
         {
            this._timeBetween -= speed;
         }
         if(this._timeBetween < this._minBetween)
         {
            this._timeBetween = this._minBetween;
         }
      }
      
      private function __enterFrame(evt:Event) : void
      {
         if(!this._paused)
         {
            if(getTimer() >= this._nextPopup)
            {
               dispatchEvent(new Event(POPUP_TIMER));
               this._nextPopup = getTimer() + this._timeBetween;
            }
         }
      }
      
      public function dispose() : void
      {
         StageReferance.stage.removeEventListener(Event.ENTER_FRAME,this.__enterFrame);
      }
   }
}

