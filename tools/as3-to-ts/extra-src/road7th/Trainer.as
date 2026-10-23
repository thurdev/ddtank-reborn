package road7th
{
   import com.greensock.TweenLite;
   import com.pickgliss.utils.ObjectUtils;
   import flash.display.DisplayObjectContainer;
   import flash.events.Event;
   import flash.net.URLLoader;
   import flash.net.URLRequest;
   import flash.net.URLRequestMethod;
   import flash.net.URLVariables;
   import par.ParticleManager;
   import road7th.core.Global;
   import road7th.data.PlayerInfo;
   import road7th.display.LayerType;
   import road7th.events.LoaderEvent;
   import road7th.game.TrainGame;
   import road7th.game.model.GameInfo;
   import road7th.loader.LoaderTask;
   import road7th.manager.GameManager;
   import road7th.manager.LayerManager;
   import road7th.manager.PathManager;
   import road7th.manager.SoundManager;
   
   public class Trainer
   {
      
      public static var self:PlayerInfo = new PlayerInfo();
      
      private var _game:GameInfo;
      
      private var _gameLoader:LoaderTask;
      
      private var _tainerGame:TrainGame;
      
      private var SmallLoading:*;
      
      private var _loadedFunc:Function;
      
      private var _completeFunc:Function;
      
      private var _progress:int;
      
      private var _preprogress:int;
      
      private var _loadTime:int;
      
      private var _startLoad:Boolean;
      
      private var _startLunch:Boolean;
      
      private var _loadComplete:Boolean;
      
      private var _md5dic:Object;
      
      private var _enterGemeMode:int;
      
      public function Trainer()
      {
         super();
      }
      
      public function lunch(stage:DisplayObjectContainer, config:XML, smallLoading:*, nickname:String, sex:String, progress:int = 70, loadedFunc:Function = null, completeFunc:Function = null, loadTime:int = 0, md5dic:Object = null, $enterGameMode:int = 1) : void
      {
         this._enterGemeMode = $enterGameMode;
         this._md5dic = md5dic;
         this._loadTime = loadTime;
         self.sex = sex;
         self.nickname = nickname;
         this._progress = progress;
         this._preprogress = 100 - this._progress;
         this._loadedFunc = loadedFunc;
         this._completeFunc = completeFunc;
         Global.initailize(stage,this._trainGameOver);
         this.SmallLoading = smallLoading;
         PathManager.initialize(config);
         SoundManager.instance.setup([],config.SITE.@value);
         ParticleManager.initPartical(PathManager.FLASHSITE,"lite");
         if(!this._startLoad)
         {
            this.startLoad(config,this._md5dic);
         }
         GameManager.Instance.Current.selfGamePlayer.name = nickname;
         GameManager.Instance.Current.selfGamePlayer.hat = Trainer.self.sex == "female" ? 13 : int(51);
         if(Boolean(this.SmallLoading))
         {
            this.SmallLoading.Instance.show(false,true);
         }
         this._gameLoader.addEventListener(LoaderEvent.PROGRESS,this.__progress);
         this._gameLoader.loadCharacter();
      }
      
      public function startLoad(config:XML, md5dic:Object, $enterGameMode:int = 1) : void
      {
         this._enterGemeMode = $enterGameMode;
         this._md5dic = md5dic;
         this._startLoad = true;
         PathManager.initialize(config);
         this._game = GameManager.Instance.createGame();
         this._gameLoader = new LoaderTask(this.createLoaderPaths(),this._game,config,this._md5dic);
         this._gameLoader.addEventListener(LoaderEvent.COMPLETE,this.__complete);
         this._gameLoader.loadOther();
      }
      
      private function enterGame() : void
      {
         if(this._enterGemeMode == 2)
         {
            this.fadingComplete();
            Global.trainOver();
            return;
         }
         Global.block.alpha = 0;
         LayerManager.addToLayer(Global.block,LayerType.Top);
         TweenLite.to(Global.block,1.3,{
            "alpha":1,
            "onComplete":this.blockComplete
         });
      }
      
      private function createLoaderPaths() : Vector.<String>
      {
         var paths:Vector.<String> = new Vector.<String>();
         paths.push(PathManager.solveResourcePath("firstTainer"));
         return paths;
      }
      
      private function __complete(event:Event) : void
      {
         if(Boolean(this.SmallLoading))
         {
            this.SmallLoading.Instance.hide();
         }
         SoundManager.instance.setupAudioResource();
         this._gameLoader.removeEventListener(LoaderEvent.PROGRESS,this.__progress);
         this._gameLoader.removeEventListener(LoaderEvent.COMPLETE,this.__complete);
         this._loadTime += this._gameLoader.loadTime;
         this.sendLoadTime(this._loadTime);
         ObjectUtils.disposeObject(this._gameLoader);
         this._gameLoader = null;
         this.enterGame();
      }
      
      private function sendLoadTime(loadTime:int) : void
      {
         var variables:URLVariables = new URLVariables();
         variables.id = -1;
         variables.type = 2;
         variables.time = loadTime;
         variables.grade = -1;
         variables.serverID = -1;
         var request:URLRequest = new URLRequest(PathManager.solveRequestPath("LogTime.ashx"));
         request.method = URLRequestMethod.POST;
         request.data = variables;
         var loader:URLLoader = new URLLoader();
         loader.load(request);
      }
      
      private function blockComplete() : void
      {
         this._tainerGame = new TrainGame(this._game);
         LayerManager.addToLayer(this._tainerGame,LayerType.Game);
         TweenLite.to(Global.block,1.3,{
            "alpha":0,
            "onComplete":this.fadingComplete
         });
      }
      
      private function fadingComplete() : void
      {
         if(Boolean(Global.block.parent))
         {
            Global.block.parent.removeChild(Global.block);
         }
         if(this._loadedFunc != null)
         {
            this._loadedFunc.apply();
         }
      }
      
      private function __progress(event:Event) : void
      {
         var rate:int = int(this._gameLoader.progress * this._progress) + this._preprogress;
         if(Boolean(this.SmallLoading))
         {
            this.SmallLoading.Instance.progress = rate > 95 ? 99 : rate;
         }
      }
      
      private function _trainGameOver() : void
      {
         if(this._completeFunc != null)
         {
            this._completeFunc.apply();
         }
      }
      
      public function dispose() : void
      {
         ObjectUtils.disposeObject(this._tainerGame);
      }
   }
}

