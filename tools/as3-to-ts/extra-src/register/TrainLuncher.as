package register
{
   import com.pickgliss.ui.ComponentSetting;
   import com.pickgliss.ui.core.Disposeable;
   import flash.display.DisplayObjectContainer;
   import flash.display.Loader;
   import flash.display.LoaderInfo;
   import flash.events.Event;
   import flash.events.IOErrorEvent;
   import flash.events.ProgressEvent;
   import flash.events.SecurityErrorEvent;
   import flash.external.ExternalInterface;
   import flash.net.URLLoader;
   import flash.net.URLLoaderDataFormat;
   import flash.net.URLRequest;
   import flash.system.ApplicationDomain;
   import flash.system.LoaderContext;
   import flash.utils.ByteArray;
   import flash.utils.getDefinitionByName;
   import flash.utils.getTimer;
   
   public class TrainLuncher implements Disposeable
   {
      
      public static var EnterGameMode:int = 1;
      
      private static const TrainDefinition:String = "road7th.Trainer";
      
      private static var TrainPath:String = "3.png";
      
      public static const LoginProgress:int = 0;
      
      public static const RegisterProgress:int = 0;
      
      public static const TrainCoreProgress:int = 10;
      
      public static const TrainerPercent:int = 34;
      
      public static const ResterPercent:int = 36;
      
      private static const TrainProgress:int = 30;
      
      private var _stage:DisplayObjectContainer;
      
      private var _config:XML;
      
      private var _nickname:String;
      
      private var _sex:String;
      
      private var _trainLoader:Loader;
      
      private var _trainDomain:ApplicationDomain = ApplicationDomain.currentDomain;
      
      private var SmallLoading:*;
      
      private var _train:*;
      
      private var _loadTime:int;
      
      private var _loadComplete:Boolean = false;
      
      private var _startLunch:Boolean = false;
      
      private var _startLoad:Boolean = false;
      
      private var dataLoader:URLLoader;
      
      private var _flashSite:String;
      
      private var _backup:String;
      
      private var _isSecondLoad:Boolean = false;
      
      public function TrainLuncher()
      {
         super();
      }
      
      public function startLoad(config:XML) : void
      {
         this._config = config;
         this._startLoad = true;
         this._flashSite = this._config.FLASHSITE.@value;
         this._backup = this._config.BACKUP_FLASHSITE.@value;
         TrainPath = this._config.FLASHSITE.@value + TrainPath + "?rn=" + Math.random();
         this.dataLoader = new URLLoader();
         this.dataLoader.dataFormat = URLLoaderDataFormat.BINARY;
         this.dataLoader.addEventListener(Event.COMPLETE,this.__trainDataComplete);
         this.dataLoader.addEventListener(IOErrorEvent.IO_ERROR,this.__loaderError);
         this.dataLoader.addEventListener(SecurityErrorEvent.SECURITY_ERROR,this.__loaderError);
         this._loadTime = getTimer();
         this.dataLoader.load(new URLRequest(TrainPath));
      }
      
      public function lunch(stage:DisplayObjectContainer, config:XML, nickname:String, sex:String) : void
      {
         this._startLunch = true;
         this.SmallLoading = getDefinitionByName(RegisterState.SmallLoadingDefinition);
         this._stage = stage;
         this._config = config;
         this._nickname = nickname;
         this._sex = sex;
         if(!this._startLoad)
         {
            this.startLoad(this._config);
            this.dataLoader.addEventListener(ProgressEvent.PROGRESS,this.__trainProgress);
            this.SmallLoading.Instance.show(false,true);
         }
         else if(this._loadComplete)
         {
            this._train.lunch(this._stage,this._config,this.SmallLoading,this._nickname,this._sex,TrainProgress,this.loadComplete,this.trainComplete,this._loadTime,null,EnterGameMode);
         }
         else
         {
            this.dataLoader.addEventListener(ProgressEvent.PROGRESS,this.__trainProgress);
            this.SmallLoading.Instance.show(false,true);
         }
      }
      
      private function dataloaderRemoveEvent() : void
      {
         this.dataLoader.removeEventListener(Event.COMPLETE,this.__trainDataComplete);
         this.dataLoader.removeEventListener(ProgressEvent.PROGRESS,this.__trainProgress);
         this.dataLoader.removeEventListener(IOErrorEvent.IO_ERROR,this.__loaderError);
         this.dataLoader.removeEventListener(SecurityErrorEvent.SECURITY_ERROR,this.__loaderError);
      }
      
      private function __trainDataComplete(event:Event) : void
      {
         var bytes:ByteArray = ByteArray(this.dataLoader.data);
         this.analyMd5(bytes);
      }
      
      public function analyMd5(content:ByteArray) : void
      {
         var temp:ByteArray = null;
         if(Boolean(ComponentSetting.md5Dic["3.png"]) || this.hasHead(content))
         {
            if(this.compareMD5(content))
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
                     ExternalInterface.call("alert",TrainPath + ":is old");
                  }
               }
               else
               {
                  TrainPath = TrainPath.replace(this._flashSite,this._backup);
                  this.dataLoader.load(new URLRequest(TrainPath));
               }
               this._isSecondLoad = true;
            }
         }
         else
         {
            this.loadContent(content);
         }
      }
      
      private function compareMD5(temp:ByteArray) : Boolean
      {
         var source:int = 0;
         var target:int = 0;
         var md5Bytes:ByteArray = new ByteArray();
         md5Bytes.writeUTFBytes(ComponentSetting.md5Dic["3.png"]);
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
         road7Byte.writeUTFBytes(ComponentSetting.swf_head);
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
         this.dataloaderRemoveEvent();
         this._trainLoader = new Loader();
         this._trainLoader.contentLoaderInfo.addEventListener(Event.COMPLETE,this.__trainComplete);
         this._trainLoader.loadBytes(bytes,new LoaderContext(false,this._trainDomain));
      }
      
      private function __loaderError(event:Event) : void
      {
         trace("train_loadererror:" + event);
      }
      
      private function __trainProgress(event:ProgressEvent) : void
      {
         if(RegisterState.HAS_REGISTERED)
         {
            this.SmallLoading.Instance.progress = int(event.bytesLoaded / event.bytesTotal * TrainerPercent) + ResterPercent;
         }
         else
         {
            this.SmallLoading.Instance.progress = int(event.bytesLoaded / event.bytesTotal * TrainCoreProgress) + LoginProgress + RegisterProgress;
         }
      }
      
      private function __trainComplete(event:Event) : void
      {
         this._loadComplete = true;
         var loaderInfo:LoaderInfo = event.currentTarget as LoaderInfo;
         loaderInfo.removeEventListener(Event.COMPLETE,this.__trainComplete);
         var trainClass:Class = this._trainDomain.getDefinition(TrainDefinition) as Class;
         this._train = new trainClass();
         this._loadTime = getTimer() - this._loadTime;
         if(this._startLunch)
         {
            this._train.lunch(this._stage,this._config,this.SmallLoading,this._nickname,this._sex,TrainProgress,this.loadComplete,this.trainComplete,this._loadTime,ComponentSetting.md5Dic,EnterGameMode);
         }
         else
         {
            this._train.startLoad(this._config,ComponentSetting.md5Dic,EnterGameMode);
         }
      }
      
      private function loadComplete() : void
      {
         GameLuncher.loadCore();
      }
      
      private function trainComplete() : void
      {
         GameLuncher.lunch();
         this.dispose();
      }
      
      public function dispose() : void
      {
         if(this._train != null)
         {
            this._train.dispose();
         }
         this._train = null;
         this._trainLoader.unloadAndStop();
         this._trainLoader = null;
         this._trainDomain = null;
         this._stage = null;
         this._config = null;
         this._nickname = null;
         this._sex = null;
         TrainPath = null;
      }
   }
}

