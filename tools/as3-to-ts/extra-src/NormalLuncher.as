package
{
   import com.pickgliss.loader.BaseLoader;
   import com.pickgliss.loader.LoaderEvent;
   import com.pickgliss.loader.LoaderManager;
   import com.pickgliss.loader.LoaderSavingManager;
   import com.pickgliss.loader.ModuleLoader;
   import com.pickgliss.toplevel.StageReferance;
   import com.pickgliss.ui.LayerManager;
   import com.pickgliss.utils.ClassUtils;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.external.ExternalInterface;
   import flash.utils.getDefinitionByName;
   import loading.MainLoading;
   
   public class NormalLuncher
   {
      
      private static const DDT_CLASS_PATH:String = "ddt.DDT";
      
      private static const StartupLoaderClass:String = "ddt.loader.StartupResourceLoader";
      
      private static const START_PROGRESS_VALUE:Number = 20;
      
      private static const CORE_PROGRESS_VALUE:Number = 20;
      
      private var CorePath:String = "2.png";
      
      private var _config:XML;
      
      private var _user:String;
      
      private var _pass:String;
      
      private var _rid:String;
      
      private var _baiduEnterCode:String;
      
      private var _minGrade:int;
      
      private var _startupLoader:*;
      
      private var smallLoading:*;
      
      private var _coreLoader:ModuleLoader;
      
      private var _mainLoading:MainLoading;
      
      public function NormalLuncher()
      {
         super();
      }
      
      public function lunch(config:XML, user:String, pass:String, rid:String, $baiduEnterCode:String) : void
      {
         this._config = config;
         this.CorePath = config.FLASHSITE.@value + "2.png";
         this._user = user;
         this._pass = pass;
         this._rid = rid;
         this._baiduEnterCode = $baiduEnterCode;
         this.smallLoading = getDefinitionByName("SmallLoading");
         this.smallLoading.Instance.setup(LayerManager.Instance.getLayerByType(LayerManager.STAGE_DYANMIC_LAYER));
         this.loadCore();
      }
      
      private function loadCore() : void
      {
         this._mainLoading = new MainLoading();
         LayerManager.Instance.addToLayer(this._mainLoading,LayerManager.STAGE_DYANMIC_LAYER);
         this._coreLoader = LoaderManager.Instance.creatLoader(this.CorePath,BaseLoader.MODULE_LOADER);
         this._coreLoader.addEventListener(LoaderEvent.COMPLETE,this.__onloadCoreComplete);
         LoaderManager.Instance.startLoad(this._coreLoader);
         StageReferance.stage.addEventListener(Event.ENTER_FRAME,this.__onLoadingProgress);
         getDefinitionByName("Loading").sendTo360Agent(this._config,this._user,2);
      }
      
      private function __onClearCacheClicked(e:MouseEvent) : void
      {
         this.reset();
         this._mainLoading.clearCacheBtn.removeEventListener(MouseEvent.CLICK,this.__onClearCacheClicked);
      }
      
      public function reset() : void
      {
         var _site:String;
         var url:String;
         try
         {
            LoaderSavingManager.clearAllCache();
         }
         catch(e:Error)
         {
         }
         _site = "";
         if(Boolean(StageReferance.stage.loaderInfo.parameters["site"]))
         {
            _site = StageReferance.stage.loaderInfo.parameters["site"];
         }
         url = String(this._config.LOGIN_PATH.@value).replace("{user}",this._user);
         url = url.replace("{site}",_site);
         try
         {
            ExternalInterface.call("toLocation",url,"已清除游戏缓存。");
         }
         catch(e:Error)
         {
            trace(e.message);
         }
      }
      
      private function __onLoadingProgress(event:Event) : void
      {
         if(this._coreLoader.isLoading)
         {
            this._mainLoading.progress = START_PROGRESS_VALUE + CORE_PROGRESS_VALUE * this._coreLoader.progress;
         }
         else if(this._coreLoader.isComplete)
         {
            this._mainLoading.progress = this._startupLoader.Instance.progress;
         }
      }
      
      private function __onLoadingHideComplete(event:Event) : void
      {
         this._mainLoading.removeEventListener(Event.COMPLETE,this.__onLoadingHideComplete);
         this._mainLoading.show();
      }
      
      private function __onloadCoreComplete(event:LoaderEvent) : void
      {
         event.loader.removeEventListener(LoaderEvent.COMPLETE,this.__onloadCoreComplete);
         var ddtInstance:* = ClassUtils.CreatInstance(DDT_CLASS_PATH);
         this._startupLoader = getDefinitionByName(StartupLoaderClass);
         this._startupLoader.Instance.addEventListener(Event.COMPLETE,this.__onStartupComplete);
         ddtInstance.lunch(this._config,this._user,this._pass,2,this._rid,this._baiduEnterCode);
      }
      
      private function __onStartupComplete(event:Event) : void
      {
         this._startupLoader.Instance.removeEventListener(Event.COMPLETE,this.__onStartupComplete);
         this._mainLoading.addEventListener(Event.COMPLETE,this.__onLoadingHideComplete);
         this._mainLoading.hide();
      }
   }
}

