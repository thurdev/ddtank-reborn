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
   import road7th.game.model.MapInfo;
   
   use namespace ddt_internal;
   
   [Event(name="error",type="road7th.events.LoaderEvent")]
   [Event(name="complete",type="road7th.events.LoaderEvent")]
   public class MapLoader extends EventDispatcher
   {
      
      private var _backLoader:DataLoader;
      
      private var _deadLoader:DataLoader;
      
      private var _map:MapInfo;
      
      private var _startup:Boolean = false;
      
      private var _loadedCount:int = 0;
      
      public function MapLoader(map:MapInfo)
      {
         super();
         this._map = map;
      }
      
      public function startup() : void
      {
         if(!this._startup)
         {
            this._backLoader = new DataLoader();
            this._backLoader.dataFormat = URLLoaderDataFormat.BINARY;
            this._backLoader.addEventListener(Event.COMPLETE,this.__backDataComplete);
            this._backLoader.addEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
            this._backLoader.load(new URLRequest(this._map.backPath));
            this._deadLoader = new DataLoader();
            this._deadLoader.dataFormat = URLLoaderDataFormat.BINARY;
            this._deadLoader.addEventListener(Event.COMPLETE,this.__deadDataComplete);
            this._deadLoader.addEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
            this._deadLoader.load(new URLRequest(this._map.deadPath));
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
      
      private function complete() : void
      {
         dispatchEvent(new LoaderEvent(LoaderEvent.COMPLETE));
      }
      
      private function __deadDataComplete(event:Event) : void
      {
         var dataLoader:DataLoader = event.currentTarget as DataLoader;
         dataLoader.removeEventListener(Event.COMPLETE,this.__deadDataComplete);
         dataLoader.removeEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
         var loader:Loader = new Loader();
         loader.contentLoaderInfo.addEventListener(Event.COMPLETE,this.__deadComplete);
         loader.loadBytes(dataLoader.data,Global.Context);
      }
      
      private function __deadComplete(event:Event) : void
      {
         var loaderInfo:LoaderInfo = event.currentTarget as LoaderInfo;
         loaderInfo.removeEventListener(Event.COMPLETE,this.__deadComplete);
         this._map.deadData = Bitmap(loaderInfo.content).bitmapData;
         ++this._loadedCount;
         if(this._loadedCount >= 2)
         {
            this.complete();
         }
      }
      
      private function __backDataComplete(event:Event) : void
      {
         var dataLoader:DataLoader = event.currentTarget as DataLoader;
         dataLoader.removeEventListener(Event.COMPLETE,this.__backDataComplete);
         dataLoader.removeEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
         var loader:Loader = new Loader();
         loader.contentLoaderInfo.addEventListener(Event.COMPLETE,this.__backComplete);
         loader.loadBytes(dataLoader.data,Global.Context);
      }
      
      private function __backComplete(event:Event) : void
      {
         var loaderInfo:LoaderInfo = event.currentTarget as LoaderInfo;
         loaderInfo.removeEventListener(Event.COMPLETE,this.__backComplete);
         this._map.backData = Bitmap(loaderInfo.content).bitmapData;
         ++this._loadedCount;
         if(this._loadedCount >= 2)
         {
            this.complete();
         }
      }
      
      public function get progress() : Number
      {
         var rate:Number = this._backLoader.bytesTotal > 0 ? Number(this._backLoader.bytesLoaded / this._backLoader.bytesTotal) : Number(0);
         rate += this._deadLoader.bytesTotal > 0 ? this._deadLoader.bytesLoaded / this._deadLoader.bytesTotal : 0;
         rate *= 0.99;
         return rate >> 1;
      }
      
      public function dispose() : void
      {
      }
   }
}

