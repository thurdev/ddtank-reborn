package road7th.game.actions
{
   import flash.display.MovieClip;
   import road7th.display.LayerType;
   import road7th.game.model.GameInfo;
   import road7th.game.view.MapView;
   import road7th.manager.GameManager;
   import road7th.manager.LayerManager;
   import road7th.manager.SoundManager;
   import road7th.utils.ClassUtils;
   import road7th.utils.MovieClipWrapper;
   
   public class GameOverAction extends BaseAction
   {
      
      private var _executed:Boolean;
      
      private var _count:int;
      
      private var _map:MapView;
      
      private var _current:GameInfo = GameManager.Instance.Current;
      
      private var _func:Function;
      
      public function GameOverAction(map:MapView, func:Function, waitTime:Number = 3000)
      {
         this._map = map;
         this._func = func;
         this._count = waitTime / 40;
         super();
      }
      
      override public function execute() : void
      {
         var movie:* = null;
         if(!this._executed)
         {
            this._executed = true;
            if(GameManager.Instance.Current.selfGamePlayer.isWin)
            {
               movie = new MovieClipWrapper(MovieClip(ClassUtils.CreatInstance("asset.game.winAsset")),true,true);
            }
            else
            {
               movie = new MovieClipWrapper(MovieClip(ClassUtils.CreatInstance("asset.game.lostAsset")),true,true);
            }
            SoundManager.instance.play("040");
            movie.movie.x = 500;
            movie.movie.y = 360;
            LayerManager.addToLayer(movie.movie,LayerType.Top);
         }
         else
         {
            --this._count;
            if(this._count <= 0)
            {
               this._func();
               _isFinished = true;
               this.cancel();
            }
         }
      }
      
      override public function cancel() : void
      {
         this._current = null;
         this._map = null;
         this._func = null;
      }
   }
}

