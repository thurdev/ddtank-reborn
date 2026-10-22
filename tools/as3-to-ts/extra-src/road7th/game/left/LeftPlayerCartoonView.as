package road7th.game.left
{
   import com.pickgliss.ui.core.Disposeable;
   import com.pickgliss.utils.ObjectUtils;
   import flash.display.Sprite;
   import road7th.events.GameEvent;
   import road7th.game.model.GameInfo;
   
   public class LeftPlayerCartoonView extends Sprite implements Disposeable
   {
      
      public static const CartoonWidth:int = 130;
      
      public static const CartoonHeight:int = 160;
      
      private var _game:GameInfo;
      
      private var _current:LivingView;
      
      public function LeftPlayerCartoonView(game:GameInfo)
      {
         this._game = game;
         super();
         this.addEvent();
      }
      
      private function addEvent() : void
      {
         this._game.addEventListener(GameEvent.CurrentChanged,this.__currentChanged);
      }
      
      private function removeEvent() : void
      {
         this._game.removeEventListener(GameEvent.CurrentChanged,this.__currentChanged);
      }
      
      private function __currentChanged(event:GameEvent) : void
      {
         if(Boolean(this._current))
         {
            this._current.leaving();
         }
         this._current = new LivingView(this._game.currentLiving);
         addChild(this._current);
         this._current.enter();
      }
      
      public function dispose() : void
      {
         this.removeEvent();
         this._game = null;
         ObjectUtils.disposeObject(this._current);
         this._current = null;
         if(Boolean(parent))
         {
            parent.removeChild(this);
         }
      }
   }
}

