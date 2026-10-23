package hamster
{
   import com.pickgliss.ui.core.Disposeable;
   import com.pickgliss.utils.ObjectUtils;
   import flash.display.Sprite;
   import flash.events.Event;
   import hamster.view.MapView;
   
   public class GameMainState extends Sprite implements Disposeable
   {
      
      private var _map:MapView;
      
      private var _gameCtrl:GameController;
      
      public function GameMainState()
      {
         super();
         this.initView();
      }
      
      private function initView() : void
      {
         this._gameCtrl = new GameController();
         this._map = new MapView(this._gameCtrl);
         addChildAt(this._map,0);
         this._map.addEventListener(Event.CLOSE,this.__close);
      }
      
      private function __close(evt:Event) : void
      {
         this.dispose();
      }
      
      public function dispose() : void
      {
         if(Boolean(this._map))
         {
            ObjectUtils.disposeObject(this._map);
         }
         this._map = null;
         if(Boolean(parent))
         {
            parent.removeChild(this);
         }
      }
   }
}

