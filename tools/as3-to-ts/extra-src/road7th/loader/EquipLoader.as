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
   import flash.utils.ByteArray;
   import road7th.core.Global;
   import road7th.core.ddt_internal;
   import road7th.data.EquipType;
   import road7th.debug.Log;
   import road7th.events.LoaderEvent;
   import road7th.game.model.LocalPlayer;
   import road7th.manager.GameManager;
   import road7th.manager.PathManager;
   
   use namespace ddt_internal;
   
   [Event(name="error",type="road7th.events.LoaderEvent")]
   [Event(name="complete",type="road7th.events.LoaderEvent")]
   public class EquipLoader extends EventDispatcher
   {
      
      private var _weaponLoader:DataLoader = new DataLoader();
      
      private var _hatLoader:DataLoader = new DataLoader();
      
      private var _self:LocalPlayer;
      
      private var _startup:Boolean = false;
      
      private var _loadedCount:int = 0;
      
      public function EquipLoader(self:LocalPlayer)
      {
         this._self = self;
         this._weaponLoader.dataFormat = URLLoaderDataFormat.BINARY;
         this._hatLoader.dataFormat = URLLoaderDataFormat.BINARY;
         super();
      }
      
      public function startup() : void
      {
         if(!this._startup)
         {
            this._weaponLoader.addEventListener(Event.COMPLETE,this.__weaponDataComplete);
            this._weaponLoader.addEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
            this._weaponLoader.load(new URLRequest(PathManager.solveWeaponPath(this._self.weaponName)));
            this._hatLoader.addEventListener(Event.COMPLETE,this.__hatDataComplete);
            this._hatLoader.addEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
            this._hatLoader.load(new URLRequest(PathManager.solveHatPath(this._self.playerInfo.sex,this._self.hat)));
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
      
      private function __weaponDataComplete(event:Event) : void
      {
         this._weaponLoader.removeEventListener(Event.COMPLETE,this.__weaponDataComplete);
         this._weaponLoader.removeEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
         var bytes:ByteArray = this._weaponLoader.data as ByteArray;
         var loader:Loader = new Loader();
         loader.contentLoaderInfo.addEventListener(Event.COMPLETE,this.__weaponComplete);
         loader.loadBytes(bytes,Global.Context);
      }
      
      private function __hatDataComplete(event:Event) : void
      {
         this._hatLoader.removeEventListener(Event.COMPLETE,this.__weaponDataComplete);
         this._hatLoader.removeEventListener(IOErrorEvent.IO_ERROR,this.__ioError);
         var bytes:ByteArray = this._hatLoader.data as ByteArray;
         var loader:Loader = new Loader();
         loader.contentLoaderInfo.addEventListener(Event.COMPLETE,this.__hatComplete);
         loader.loadBytes(bytes,Global.Context);
      }
      
      private function __hatComplete(event:Event) : void
      {
         var loaderInfo:LoaderInfo = event.currentTarget as LoaderInfo;
         loaderInfo.removeEventListener(Event.COMPLETE,this.__hatComplete);
         GameManager.Instance.storeEquip(EquipType.Hat,Bitmap(loaderInfo.content).bitmapData);
         ++this._loadedCount;
         if(this._loadedCount >= 2)
         {
            this.complete();
         }
      }
      
      private function __weaponComplete(event:Event) : void
      {
         var loaderInfo:LoaderInfo = event.currentTarget as LoaderInfo;
         loaderInfo.removeEventListener(Event.COMPLETE,this.__weaponComplete);
         GameManager.Instance.storeEquip(EquipType.Weapon,Bitmap(loaderInfo.content).bitmapData);
         ++this._loadedCount;
         if(this._loadedCount >= 2)
         {
            this.complete();
         }
      }
      
      public function get progress() : Number
      {
         var rate:Number = this._weaponLoader.bytesLoaded / this._weaponLoader.bytesTotal;
         rate += this._hatLoader.bytesLoaded / this._hatLoader.bytesTotal;
         rate *= 0.99;
         return rate >> 1;
      }
      
      private function complete() : void
      {
         dispatchEvent(new LoaderEvent(LoaderEvent.COMPLETE));
      }
   }
}

