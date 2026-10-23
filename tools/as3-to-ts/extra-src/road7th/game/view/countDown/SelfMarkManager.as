package road7th.game.view.countDown
{
   import road7th.core.Global;
   import road7th.display.LayerType;
   import road7th.manager.LayerManager;
   
   public class SelfMarkManager
   {
      
      private static var _instance:SelfMarkManager;
      
      private var _view:SelfMarkBar;
      
      private var _canDo:Boolean = true;
      
      public function SelfMarkManager()
      {
         super();
      }
      
      public static function get instance() : SelfMarkManager
      {
         if(_instance == null)
         {
            _instance = new SelfMarkManager();
         }
         return _instance;
      }
      
      public function get canDo() : Boolean
      {
         return this._canDo;
      }
      
      public function set canDo(value:Boolean) : void
      {
         if(this._canDo == value)
         {
            return;
         }
         this._canDo = value;
      }
      
      public function show() : void
      {
         if(Boolean(this._view) || !this._canDo)
         {
            this.dispose();
            return;
         }
         this._view = new SelfMarkBar();
         this._view.x = Global.stageWidth / 2;
         this._view.y = Global.stageHeight / 2 - 200;
         LayerManager.addToLayer(this._view,LayerType.Top);
         this._view.showNum();
      }
      
      public function pause() : void
      {
         if(Boolean(this._view))
         {
            this._view.pause();
         }
      }
      
      public function dispose() : void
      {
         if(Boolean(this._view))
         {
            this._view.dispose();
         }
         this._view = null;
      }
   }
}

