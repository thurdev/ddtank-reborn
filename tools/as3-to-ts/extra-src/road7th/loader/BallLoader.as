package road7th.loader
{
   import flash.display.Bitmap;
   import flash.display.Loader;
   import flash.display.LoaderInfo;
   import flash.events.Event;
   import flash.events.EventDispatcher;
   import flash.events.IOErrorEvent;
   import flash.net.URLLoaderDataFormat;
   import flash.net.URLRequest;
   import road7th.core.Global;
   import road7th.core.ddt_internal;
   import road7th.debug.Log;
   import road7th.events.LoaderEvent;
   import road7th.game.model.BallInfo;
   import road7th.manager.BallManager;
   import road7th.manager.PathManager;
   
   use namespace ddt_internal;
   
   [Event(name="error",type="road7th.events.LoaderEvent")]
   [Event(name="complete",type="road7th.events.LoaderEvent")]
   public class BallLoader extends EventDispatcher
   {
      
      private var _ball:BallInfo;
      
      private var _bulletLoader:DataLoader;
      
      private var _blastOutLoader:DataLoader;
      
      private var _craterLoader:DataLoader;
      
      private var _craterBrinkLoader:DataLoader;
      
      private var _startup:Boolean = false;
      
      private var _loadedCount:int = 0;
      
      public function BallLoader(ball:BallInfo)
      {
         this._ball = ball;
         super();
      }
      
      public function startup() : void
      {
         if(!this._startup)
         {
            this._bulletLoader = new DataLoader();
            this._bulletLoader.dataFormat = URLLoaderDataFormat.BINARY;
            this._bulletLoader.addEventListener(Event.COMPLETE,this.__bulletDataComplete);
            this._bulletLoader.addEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
            this._bulletLoader.load(new URLRequest(PathManager.solveBullet(this._ball.blastOutID)));
            this._blastOutLoader = new DataLoader();
            this._blastOutLoader.dataFormat = URLLoaderDataFormat.BINARY;
            this._blastOutLoader.addEventListener(Event.COMPLETE,this.__blastOutDataComplete);
            this._blastOutLoader.addEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
            this._blastOutLoader.load(new URLRequest(PathManager.solveBlastOut(this._ball.ID)));
            this._craterLoader = new DataLoader();
            this._craterLoader.dataFormat = URLLoaderDataFormat.BINARY;
            this._craterLoader.addEventListener(Event.COMPLETE,this.__craterDataComplete);
            this._craterLoader.addEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
            this._craterLoader.load(new URLRequest(PathManager.solveCrater(this._ball.craterID)));
            this._craterBrinkLoader = new DataLoader();
            this._craterBrinkLoader.dataFormat = URLLoaderDataFormat.BINARY;
            this._craterBrinkLoader.addEventListener(Event.COMPLETE,this.__craterBrinkDataComplete);
            this._craterBrinkLoader.addEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
            this._craterBrinkLoader.load(new URLRequest(PathManager.solveCraterBrink(this._ball.craterID)));
            this._startup = true;
         }
      }
      
      private function __ioError(event:IOErrorEvent) : void
      {
         var loader:DataLoader = event.currentTarget as DataLoader;
         if(loader.tryCount < 10)
         {
            loader.tryAgain();
         }
         else
         {
            Log.toTrace("EquipLoader__ioError:" + event.text);
            loader.removeEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
            ++this._loadedCount;
         }
      }
      
      private function __craterBrinkDataComplete(event:Event) : void
      {
         var dataLoader:DataLoader = event.currentTarget as DataLoader;
         dataLoader.removeEventListener(Event.COMPLETE,this.__craterBrinkDataComplete);
         dataLoader.removeEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
         var loader:Loader = new Loader();
         loader.contentLoaderInfo.addEventListener(Event.COMPLETE,this.__craterBrinkComplete);
         loader.loadBytes(dataLoader.data,Global.Context);
      }
      
      private function __craterBrinkComplete(event:Event) : void
      {
         var loaderInfo:LoaderInfo = event.currentTarget as LoaderInfo;
         loaderInfo.removeEventListener(Event.COMPLETE,this.__craterBrinkComplete);
         BallManager.addBombAsset(this._ball.ID,Bitmap(loaderInfo.content),BallManager.CREATER_BRINK);
         ++this._loadedCount;
         this.complete();
      }
      
      private function __craterDataComplete(event:Event) : void
      {
         var dataLoader:DataLoader = event.currentTarget as DataLoader;
         dataLoader.removeEventListener(Event.COMPLETE,this.__craterDataComplete);
         dataLoader.removeEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
         var loader:Loader = new Loader();
         loader.contentLoaderInfo.addEventListener(Event.COMPLETE,this.__craterComplete);
         loader.loadBytes(dataLoader.data,Global.Context);
      }
      
      private function __craterComplete(event:Event) : void
      {
         var loaderInfo:LoaderInfo = event.currentTarget as LoaderInfo;
         loaderInfo.removeEventListener(Event.COMPLETE,this.__craterComplete);
         BallManager.addBombAsset(this._ball.ID,Bitmap(loaderInfo.content),BallManager.CRATER);
         ++this._loadedCount;
         this.complete();
      }
      
      private function __blastOutDataComplete(event:Event) : void
      {
         var dataLoader:DataLoader = event.currentTarget as DataLoader;
         dataLoader.removeEventListener(Event.COMPLETE,this.__blastOutDataComplete);
         dataLoader.removeEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
         var loader:Loader = new Loader();
         loader.contentLoaderInfo.addEventListener(Event.COMPLETE,this.__blastOutComplete);
         loader.loadBytes(dataLoader.data,Global.Context);
      }
      
      private function __blastOutComplete(event:Event) : void
      {
         var loaderInfo:LoaderInfo = event.currentTarget as LoaderInfo;
         loaderInfo.removeEventListener(Event.COMPLETE,this.__blastOutComplete);
         ++this._loadedCount;
         this.complete();
         loaderInfo.loader.unload();
      }
      
      private function __bulletDataComplete(event:Event) : void
      {
         var dataLoader:DataLoader = event.currentTarget as DataLoader;
         dataLoader.removeEventListener(Event.COMPLETE,this.__bulletDataComplete);
         dataLoader.removeEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
         var loader:Loader = new Loader();
         loader.contentLoaderInfo.addEventListener(Event.COMPLETE,this.__bulletComplete);
         loader.loadBytes(dataLoader.data,Global.Context);
      }
      
      private function __bulletComplete(event:Event) : void
      {
         var loaderInfo:LoaderInfo = event.currentTarget as LoaderInfo;
         loaderInfo.removeEventListener(Event.COMPLETE,this.__bulletComplete);
         ++this._loadedCount;
         this.complete();
         loaderInfo.loader.unload();
      }
      
      public function get progress() : Number
      {
         return this._loadedCount / 4;
      }
      
      private function complete() : void
      {
         if(this._loadedCount >= 4)
         {
            dispatchEvent(new LoaderEvent(LoaderEvent.COMPLETE));
         }
      }
   }
}

