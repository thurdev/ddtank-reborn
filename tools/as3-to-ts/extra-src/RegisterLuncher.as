package
{
   import asset.loading.RegisterBgAsset;
   import flash.display.Loader;
   import flash.display.MovieClip;
   import flash.display.Sprite;
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
   
   public class RegisterLuncher extends Sprite
   {
      
      private static var RegisterPath:String = "1.png";
      
      private static const RegisterCodeModulePercent:int = 18;
      
      private static const RegisterCodeModulePercent1:int = 34;
      
      private static const RegisterUIModulePercent:int = 82;
      
      private static const TrainerPercent:int = 53;
      
      private static const EnterRegisterStateFunctionName:String = "register.RegisterState";
      
      private static const RegisterUIModule:String = "choicefigure";
      
      private static const ROAD_COMPONENT:String = "roadComponent";
      
      private var _registerBg:Sprite;
      
      private var _config:XML;
      
      private var _user:String;
      
      private var _pass:String;
      
      private var _configURL:String = "config.xml";
      
      private var _rid:String;
      
      private var _baiduEnterCode:String;
      
      private var _hasRegistered:Boolean;
      
      private var _nickname:String;
      
      private var _sex:Boolean;
      
      private var progress:MovieClip;
      
      private var UIModuleLoader:*;
      
      private var StageReferance:*;
      
      private var LoaderManager:*;
      
      private var ClassUtils:*;
      
      private var ComponentSetting:*;
      
      private var LayerManager:*;
      
      private var LoaderSavingManager:*;
      
      private var _dataLoader:URLLoader;
      
      private var _oldFlashSite:String;
      
      private var _backUrl:String;
      
      private var _md5Dic:Object = null;
      
      private var _isSecondLoad:Boolean = false;
      
      public function RegisterLuncher()
      {
         super();
      }
      
      public function lunch(config:XML, user:String, pass:String, rid:String, $baiduEnterCode:String, hasRegistered:Boolean, nickname:String = "", sex:Boolean = true, md5Dic:Object = null) : void
      {
         this._config = config;
         this._hasRegistered = hasRegistered;
         this._nickname = nickname;
         this._sex = sex;
         this._md5Dic = md5Dic;
         this._oldFlashSite = this._config..config[0].FLASHSITE.@value;
         this._backUrl = this._config..config[0].BACKUP_FLASHSITE.@value;
         RegisterPath = this._oldFlashSite + RegisterPath + "?" + Math.random();
         this._user = user;
         this._pass = pass;
         this._rid = rid;
         this._baiduEnterCode = $baiduEnterCode;
         this._registerBg = new RegisterBgAsset() as Sprite;
         addChild(this._registerBg);
         SmallLoading.Instance.show(false,true);
         SmallLoading.Instance.progress = 0;
         this._dataLoader = new URLLoader();
         this._dataLoader.dataFormat = URLLoaderDataFormat.BINARY;
         this._dataLoader.addEventListener(Event.COMPLETE,this.__registerDataComplete);
         this._dataLoader.addEventListener(ProgressEvent.PROGRESS,this.__onRegisterProgress);
         this._dataLoader.addEventListener(IOErrorEvent.IO_ERROR,this.__loaderError);
         this._dataLoader.addEventListener(SecurityErrorEvent.SECURITY_ERROR,this.__loaderError);
         this._dataLoader.load(new URLRequest(RegisterPath));
      }
      
      private function __loaderError(event:Event) : void
      {
         trace(event);
      }
      
      private function dataLoaderRemoveEvent() : void
      {
         this._dataLoader.removeEventListener(Event.COMPLETE,this.__registerDataComplete);
         this._dataLoader.removeEventListener(ProgressEvent.PROGRESS,this.__onRegisterProgress);
         this._dataLoader.removeEventListener(IOErrorEvent.IO_ERROR,this.__loaderError);
         this._dataLoader.removeEventListener(SecurityErrorEvent.SECURITY_ERROR,this.__loaderError);
      }
      
      private function __registerDataComplete(event:Event) : void
      {
         var bytes:ByteArray = ByteArray(this._dataLoader.data);
         this.analyMd5(bytes);
      }
      
      public function analyMd5(content:ByteArray) : void
      {
         var temp:ByteArray = null;
         if(Boolean(this._md5Dic) && (Boolean(this._md5Dic["1.png"]) || Boolean(this.hasHead(content))))
         {
            if(this.compareMD5(content))
            {
               temp = new ByteArray();
               content.position = 37;
               content.readBytes(temp);
               this.regsisterLoad(temp);
            }
            else
            {
               if(this._isSecondLoad)
               {
                  if(ExternalInterface.available)
                  {
                     ExternalInterface.call("alert",RegisterPath + ":is old");
                  }
               }
               else
               {
                  RegisterPath = RegisterPath.replace(this._oldFlashSite,this._backUrl);
                  this._dataLoader.load(new URLRequest(RegisterPath));
               }
               this._isSecondLoad = true;
            }
         }
         else
         {
            this.regsisterLoad(content);
         }
      }
      
      private function compareMD5(temp:ByteArray) : Boolean
      {
         var source:int = 0;
         var target:int = 0;
         var md5Bytes:ByteArray = new ByteArray();
         md5Bytes.writeUTFBytes(this._md5Dic["1.png"]);
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
         road7Byte.writeUTFBytes(this.ComponentSetting.swf_head);
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
      
      private function regsisterLoad(content:ByteArray) : void
      {
         this.dataLoaderRemoveEvent();
         var regsisterLoader:Loader = new Loader();
         regsisterLoader.contentLoaderInfo.addEventListener(Event.COMPLETE,this.__onLoadRegisterComplete);
         regsisterLoader.loadBytes(content,new LoaderContext(false,ApplicationDomain.currentDomain));
      }
      
      private function __onRegisterProgress(event:ProgressEvent) : void
      {
         SmallLoading.Instance.progress = int(event.bytesLoaded / event.bytesTotal * this.registerCodePercent);
      }
      
      private function __onLoadRegisterComplete(event:Event) : void
      {
         var node:XML = null;
         this.initComponent();
         event.target.removeEventListener(Event.COMPLETE,this.__onLoadRegisterComplete);
         event.target.removeEventListener(ProgressEvent.PROGRESS,this.__onRegisterProgress);
         this.StageReferance.setup(stage);
         var loaderContext:LoaderContext = new LoaderContext(false,ApplicationDomain.currentDomain);
         this.LoaderManager.Instance.setup(loaderContext,String(Math.random()));
         var temp:XMLList = this._config..update;
         for each(node in temp)
         {
            this.LoaderSavingManager.parseUpdate(node);
         }
         this.ClassUtils.uiSourceDomain = loaderContext.applicationDomain;
         this.ComponentSetting.LANGUAGE = this._config..config[0].LANGUAGE.@value;
         this.ComponentSetting.md5Dic = this._md5Dic;
         this.LayerManager.Instance.setup(this.StageReferance.stage);
         this.UIModuleLoader.Instance.setup(this._config..config[0].FLASHSITE.@value,this._config..config[0].BACKUP_FLASHSITE.@value);
         SmallLoading.Instance.setup(this.LayerManager.Instance.getLayerByType(this.LayerManager.STAGE_DYANMIC_LAYER));
         this.UIModuleLoader.Instance.addEventListener("uiMoudleProgress",this.__onUIModuleProgress);
         this.UIModuleLoader.Instance.addEventListener("uiModuleComplete",this.__onUIModuleComplete);
         this.UIModuleLoader.Instance.addUIModuleImp(RegisterUIModule);
      }
      
      private function initComponent() : void
      {
         this.UIModuleLoader = getDefinitionByName("com.pickgliss.loader.UIModuleLoader");
         this.StageReferance = getDefinitionByName("com.pickgliss.toplevel.StageReferance");
         this.LoaderManager = getDefinitionByName("com.pickgliss.loader.LoaderManager");
         this.ClassUtils = getDefinitionByName("com.pickgliss.utils.ClassUtils");
         this.ComponentSetting = getDefinitionByName("com.pickgliss.ui.ComponentSetting");
         this.LayerManager = getDefinitionByName("com.pickgliss.ui.LayerManager");
         this.LoaderSavingManager = getDefinitionByName("com.pickgliss.loader.LoaderSavingManager");
      }
      
      private function __onUIModuleComplete(event:Event) : void
      {
         this.UIModuleLoader.Instance.removeEventListener("uiMoudleProgress",this.__onUIModuleProgress);
         this.UIModuleLoader.Instance.removeEventListener("uiModuleComplete",this.__onUIModuleComplete);
         this.UIModuleLoader.Instance.addEventListener("uiModuleComplete",this.__onUIModuleComplete1);
         this.UIModuleLoader.Instance.addUIModuleImp(ROAD_COMPONENT);
      }
      
      private function __onUIModuleComplete1(event:Event) : void
      {
         this.UIModuleLoader.Instance.removeEventListener("uiModuleComplete",this.__onUIModuleComplete1);
         if(!this._hasRegistered)
         {
            SmallLoading.Instance.hide();
         }
         var RegisterState:* = getDefinitionByName(EnterRegisterStateFunctionName);
         RegisterState.EnterRegisterState(this._config..config[0],this._user,this._pass,this._rid,this._baiduEnterCode,this._hasRegistered,this._nickname,this._sex);
         getDefinitionByName("Loading").sendTo360Agent(this._config..config[0],this._user,2);
      }
      
      private function __onUIModuleProgress(event:Event) : void
      {
         SmallLoading.Instance.progress = Math.round(event["loader"].progress * this.registerUIPercent) + this.registerCodePercent;
      }
      
      private function get registerCodePercent() : int
      {
         if(this._hasRegistered)
         {
            return 33;
         }
         return 49;
      }
      
      private function get registerUIPercent() : int
      {
         if(this._hasRegistered)
         {
            return 33;
         }
         return 51;
      }
   }
}

