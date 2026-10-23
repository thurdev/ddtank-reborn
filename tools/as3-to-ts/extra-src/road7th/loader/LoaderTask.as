package road7th.loader
{
   import flash.display.Bitmap;
   import flash.display.Loader;
   import flash.display.LoaderInfo;
   import flash.events.Event;
   import flash.events.EventDispatcher;
   import flash.events.IOErrorEvent;
   import flash.external.ExternalInterface;
   import flash.net.URLLoaderDataFormat;
   import flash.net.URLRequest;
   import flash.utils.ByteArray;
   import flash.utils.getTimer;
   import road7th.core.Global;
   import road7th.core.ddt_internal;
   import road7th.debug.Log;
   import road7th.events.LoaderEvent;
   import road7th.game.model.GameInfo;
   import road7th.interfaces.IProcessObject;
   import road7th.manager.GameManager;
   import road7th.manager.PathManager;
   import road7th.manager.ProcessManager;
   
   use namespace ddt_internal;
   
   [Event(name="error",type="road7th.events.LoaderEvent")]
   [Event(name="start",type="road7th.events.LoaderEvent")]
   [Event(name="progress",type="road7th.events.LoaderEvent")]
   [Event(name="complete",type="road7th.events.LoaderEvent")]
   public class LoaderTask extends EventDispatcher implements IProcessObject
   {
      
      public static const MD5_OBJECT:Array = [".swf",".png"];
      
      private static const MAX_COUNT:int = 5;
      
      private var _onProcess:Boolean = false;
      
      private var _elapsed:int = 0;
      
      private var _mapLoader:MapLoader;
      
      private var _ballLoader:BallLoader;
      
      private var _characterLoader:DataLoader;
      
      private var _equipLoader:EquipLoader;
      
      private var _loadedCount:int;
      
      private var _loadTotal:int;
      
      private var _path:Vector.<String>;
      
      private var _loaders:Vector.<DataLoader> = new Vector.<DataLoader>();
      
      private var _game:GameInfo;
      
      private var _loadTime:int = 0;
      
      private var _flashSite:String = "";
      
      private var _backup:String = "";
      
      private var _md5Dic:Object = null;
      
      private var _isSecondLoad:Boolean = false;
      
      public function LoaderTask(path:Vector.<String>, game:GameInfo, config:XML, md5Dic:Object)
      {
         var npc:* = null;
         super();
         this._game = game;
         this._path = path;
         this._md5Dic = md5Dic;
         this._flashSite = config.FLASHSITE.@value;
         this._backup = config.BACKUP_FLASHSITE.@value;
         for each(npc in this._game.map.npcs)
         {
            this._path.push(PathManager.solveMapNPCPath(npc));
         }
         this._loadTotal = this._path.length + 4;
      }
      
      public function loadCharacter() : void
      {
         if(!this._onProcess)
         {
            this._loadTime = getTimer();
            ProcessManager.Instance.addObject(this);
            this._characterLoader = new DataLoader();
            this._characterLoader.dataFormat = URLLoaderDataFormat.BINARY;
            this._characterLoader.addEventListener(Event.COMPLETE,this.__characterDataComplete);
            this._characterLoader.addEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
            this._characterLoader.load(new URLRequest(PathManager.solveCharacterPath(this._game.selfGamePlayer.playerInfo.sex)));
            this._equipLoader = new EquipLoader(this._game.selfGamePlayer);
            this._equipLoader.addEventListener(LoaderEvent.COMPLETE,this.__equipComplete);
            this._equipLoader.startup();
         }
      }
      
      public function loadOther() : void
      {
         this._mapLoader = new MapLoader(this._game.map);
         this._ballLoader = new BallLoader(GameManager.creatBall());
         this._mapLoader.addEventListener(LoaderEvent.COMPLETE,this.__mapComplete);
         this._mapLoader.startup();
         this._ballLoader.addEventListener(LoaderEvent.COMPLETE,this.__ballComplete);
         this._ballLoader.startup();
         while(this._path.length > 0 && this._loaders.length < MAX_COUNT)
         {
            this.loadNext();
         }
      }
      
      private function __equipComplete(event:LoaderEvent) : void
      {
         this._equipLoader.removeEventListener(LoaderEvent.COMPLETE,this.__equipComplete);
         ++this._loadedCount;
         if(this._loadedCount >= this._loadTotal)
         {
            this.complete();
         }
      }
      
      private function __ballComplete(event:Event) : void
      {
         this._ballLoader.removeEventListener(LoaderEvent.COMPLETE,this.__ballComplete);
         ++this._loadedCount;
         if(this._loadedCount >= this._loadTotal)
         {
            this.complete();
         }
      }
      
      private function __characterDataComplete(event:Event) : void
      {
         var dataLoader:DataLoader = event.currentTarget as DataLoader;
         dataLoader.removeEventListener(Event.COMPLETE,this.__characterDataComplete);
         dataLoader.removeEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
         var loader:Loader = new Loader();
         loader.contentLoaderInfo.addEventListener(Event.COMPLETE,this.__characterComplete);
         loader.loadBytes(dataLoader.data,Global.Context);
      }
      
      private function __characterComplete(event:Event) : void
      {
         var loaderInfo:LoaderInfo = event.currentTarget as LoaderInfo;
         loaderInfo.removeEventListener(Event.COMPLETE,this.__characterComplete);
         Global.selfCharacterData = Bitmap(loaderInfo.content).bitmapData;
         ++this._loadedCount;
         if(this._loadedCount >= this._loadTotal)
         {
            this.complete();
         }
      }
      
      private function __mapComplete(event:Event) : void
      {
         this._mapLoader.removeEventListener(LoaderEvent.COMPLETE,this.__mapComplete);
         ++this._loadedCount;
         if(this._loadedCount >= this._loadTotal)
         {
            this.complete();
         }
      }
      
      private function __ioError(event:IOErrorEvent) : void
      {
         var idx:int = 0;
         var dataLoader:DataLoader = event.currentTarget as DataLoader;
         if(dataLoader.tryCount < 10)
         {
            dataLoader.tryAgain();
         }
         else
         {
            Log.toTrace("LoaderTask__ioError:" + event.text);
            dataLoader.removeEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
            dataLoader.removeEventListener(Event.COMPLETE,this.__loaderDataComplete);
            idx = this._loaders.indexOf(dataLoader);
            if(idx >= 0)
            {
               this._loaders.splice(idx,1);
            }
            ++this._loadedCount;
            this.loadNext();
         }
      }
      
      private function __loaderDataComplete(event:Event) : void
      {
         Log.toTrace("__loaderDataComplete");
         var dataLoader:DataLoader = event.currentTarget as DataLoader;
         dataLoader.removeEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
         dataLoader.removeEventListener(Event.COMPLETE,this.__loaderDataComplete);
         var idx:int = this._loaders.indexOf(dataLoader);
         if(idx >= 0)
         {
            this._loaders.splice(idx,1);
         }
         var bytes:ByteArray = dataLoader.data;
         var url:String = dataLoader.url;
         this.analyMd5(bytes,url);
      }
      
      private function analyMd5(content:ByteArray, url:String) : void
      {
         var temp:* = null;
         var backloader:* = null;
         var newurl:String = url.replace(this._flashSite,this._backup);
         var name:String = this.getName(url);
         if(Boolean(this._md5Dic[name]) || this.hasHead(content))
         {
            if(this.compareMD5(content,name))
            {
               temp = new ByteArray();
               content.position = 37;
               content.readBytes(temp);
               this.loadContent(temp);
            }
            else
            {
               if(this._isSecondLoad)
               {
                  if(ExternalInterface.available)
                  {
                     ExternalInterface.call("alert",newurl + ":is old");
                  }
               }
               else
               {
                  backloader = new DataLoader();
                  backloader.dataFormat = URLLoaderDataFormat.BINARY;
                  backloader.addEventListener(Event.COMPLETE,this.__loaderDataComplete);
                  backloader.addEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
                  backloader.load(new URLRequest(newurl));
               }
               this._isSecondLoad = true;
            }
         }
         else
         {
            this.loadContent(content);
         }
      }
      
      private function getName(url:String) : String
      {
         var name:String = "";
         for(var i:int = 0; i < MD5_OBJECT.length; i++)
         {
            if(url.indexOf(MD5_OBJECT[i]) != -1)
            {
               name = url.substring(url.lastIndexOf("/") + 1,url.indexOf(MD5_OBJECT[i]) + MD5_OBJECT[i].length);
            }
         }
         return name.toLowerCase();
      }
      
      private function compareMD5(temp:ByteArray, fileName:String) : Boolean
      {
         var source:int = 0;
         var target:int = 0;
         var md5Bytes:ByteArray = new ByteArray();
         md5Bytes.writeUTFBytes(this._md5Dic[fileName]);
         md5Bytes.position = 0;
         temp.position = 5;
         while(md5Bytes.bytesAvailable > 0)
         {
            source = md5Bytes.readByte();
            target = temp.readByte();
            if(source != target)
            {
               return false;
            }
         }
         return true;
      }
      
      private function hasHead(temp:ByteArray) : Boolean
      {
         var source:int = 0;
         var target:int = 0;
         var road7Byte:ByteArray = new ByteArray();
         road7Byte.writeUTFBytes("road7");
         road7Byte.position = 0;
         temp.position = 0;
         while(road7Byte.bytesAvailable > 0)
         {
            source = road7Byte.readByte();
            target = temp.readByte();
            if(source != target)
            {
               return false;
            }
         }
         return true;
      }
      
      private function loadContent(bytes:ByteArray) : void
      {
         var loader:Loader = new Loader();
         loader.contentLoaderInfo.addEventListener(Event.COMPLETE,this.__loaderComplete);
         loader.loadBytes(bytes,Global.Context);
      }
      
      private function __loaderComplete(event:Event) : void
      {
         var loaderInfo:LoaderInfo = event.currentTarget as LoaderInfo;
         loaderInfo.removeEventListener(Event.COMPLETE,this.__loaderComplete);
         ++this._loadedCount;
         this.loadNext();
      }
      
      private function loadNext() : void
      {
         var path:* = null;
         var loader:* = null;
         if(this._loadedCount >= this._loadTotal)
         {
            this.complete();
         }
         else if(this._path.length > 0 && this._loaders.length < MAX_COUNT)
         {
            path = this._path.shift();
            loader = new DataLoader();
            loader.dataFormat = URLLoaderDataFormat.BINARY;
            this._loaders.push(loader);
            loader.addEventListener(Event.COMPLETE,this.__loaderDataComplete);
            loader.addEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
            loader.load(new URLRequest(path));
         }
      }
      
      private function complete() : void
      {
         this._loadTime = getTimer() - this._loadTime;
         ProcessManager.Instance.removeObject(this);
         dispatchEvent(new LoaderEvent(LoaderEvent.COMPLETE));
      }
      
      public function get loadTime() : int
      {
         return this._loadTime;
      }
      
      public function get progress() : Number
      {
         var loader:* = null;
         var rate:Number = this._mapLoader.progress >= 1 ? 0 : Number(this._mapLoader.progress / this._loadTotal);
         rate = this._equipLoader.progress >= 1 ? 0 : Number(this._equipLoader.progress / this._loadTotal);
         rate += this._ballLoader.progress >= 1 ? 0 : this._ballLoader.progress / this._loadTotal;
         if(this._characterLoader.bytesTotal > 0)
         {
            rate += this._characterLoader.bytesLoaded >= this._characterLoader.bytesTotal ? 0 : this._characterLoader.bytesLoaded / this._characterLoader.bytesTotal / this._loadTotal;
         }
         for each(loader in this._loaders)
         {
            if(loader.bytesTotal > 0)
            {
               rate += loader.bytesLoaded / loader.bytesTotal >= 1 ? 0 : loader.bytesLoaded / loader.bytesTotal / this._loadTotal;
            }
         }
         return Number(rate + this._loadedCount / this._loadTotal);
      }
      
      public function get onProcess() : Boolean
      {
         return this._onProcess;
      }
      
      public function set onProcess(val:Boolean) : void
      {
         this._onProcess = val;
      }
      
      public function get priority() : int
      {
         return 0;
      }
      
      public function process(rate:Number) : void
      {
         dispatchEvent(new LoaderEvent(LoaderEvent.PROGRESS));
      }
      
      public function dispose() : void
      {
      }
   }
}

