package
{
   import com.pickgliss.loader.BaseLoader;
   import com.pickgliss.loader.LoaderEvent;
   import com.pickgliss.loader.LoaderManager;
   import com.pickgliss.loader.LoaderSavingManager;
   import com.pickgliss.loader.TextLoader;
   import com.pickgliss.loader.UIModuleLoader;
   import com.pickgliss.toplevel.StageReferance;
   import com.pickgliss.ui.ComponentSetting;
   import com.pickgliss.ui.LayerManager;
   import com.pickgliss.utils.ClassUtils;
   import com.pickgliss.utils.MD5;
   import flash.display.Sprite;
   import flash.display.StageAlign;
   import flash.display.StageScaleMode;
   import flash.events.ErrorEvent;
   import flash.events.Event;
   import flash.net.URLLoader;
   import flash.net.URLRequest;
   import flash.net.URLVariables;
   import flash.system.ApplicationDomain;
   import flash.system.LoaderContext;
   
   [SWF(width="1000", height="600", backgroundColor="#000000", frameRate="25")]
   [SWF(width="1000",height="600",frameRate="25",backgroundColor="#000000")]
   public class DDT_Loading extends Sprite
   {
      
      public static var time:Number;
      
      private var _configLoader:TextLoader;
      
      private var _config:XML;
      
      private var _luncher:NormalLuncher;
      
      private var _requestPath:String;
      
      private var _user:String = "liang01";
      
      private var _pass:String = "111111";
      
      private var _configURL:String = "config.xml";
      
      private var _minGrade:int;
      
      private var _rid:String = "";
      
      private var _baiduEnterCode:String = "";
      
      public function DDT_Loading()
      {
         super();
         this._configURL = "config.xml";
         if(Boolean(stage))
         {
            this.init();
         }
         else
         {
            addEventListener(Event.ADDED_TO_STAGE,this.init);
         }
      }
      
      private function init(event:Event = null) : void
      {
         removeEventListener(Event.ADDED_TO_STAGE,this.init);
         time = new Date().getTime();
         stage.align = StageAlign.TOP_LEFT;
         stage.scaleMode = StageScaleMode.EXACT_FIT;
         StageReferance.setup(stage);
         if(Boolean(stage.loaderInfo.parameters["config"]) && String(stage.loaderInfo.parameters["config"]).length > 1)
         {
            this._configURL = stage.loaderInfo.parameters["config"];
         }
         var loaderContext:LoaderContext = new LoaderContext(false,ApplicationDomain.currentDomain);
         LoaderManager.Instance.setup(loaderContext,String(Math.random()));
         ClassUtils.uiSourceDomain = loaderContext.applicationDomain;
         this._configLoader = LoaderManager.Instance.creatLoader(this._configURL,BaseLoader.TEXT_LOADER);
         this._configLoader.addEventListener(LoaderEvent.COMPLETE,this.__onConfigLoadComplete);
         LoaderManager.Instance.startLoad(this._configLoader);
      }
      
      private function __onConfigLoadComplete(event:LoaderEvent) : void
      {
         var node:XML = null;
         this._configLoader.removeEventListener(LoaderEvent.COMPLETE,this.__onConfigLoadComplete);
         var config:XML = new XML(event.loader.content);
         var temp:XMLList = config..update;
         for each(node in temp)
         {
            LoaderSavingManager.parseUpdate(node);
         }
         temp = config..config;
         if(temp.length() > 0)
         {
            this._config = temp[0];
            ComponentSetting.LANGUAGE = this._config[0].LANGUAGE.@value;
            this._requestPath = this._config[0].REQUEST_PATH.@value;
            LayerManager.Instance.setup(StageReferance.stage);
            UIModuleLoader.Instance.setup(this._config[0].FLASHSITE.@value,this._config[0].BACKUP_FLASHSITE.@value);
            if(Boolean(stage.loaderInfo.parameters["user"]))
            {
               this._user = stage.loaderInfo.parameters["user"];
            }
            if(Boolean(stage.loaderInfo.parameters["key"]))
            {
               this._pass = stage.loaderInfo.parameters["key"];
            }
            if(Boolean(stage.loaderInfo.parameters["rid"]))
            {
               this._rid = stage.loaderInfo.parameters["rid"];
            }
            this._baiduEnterCode = stage.loaderInfo.parameters["enterCode"];
            this.lunchNormal();
            return;
         }
         throw new ErrorEvent("SELECTLIST_LOAD_ERROR",true,false,"Load config file fail! please try again later!");
      }
      
      private function lunchNormal() : void
      {
         this._luncher = new NormalLuncher();
         this._luncher.lunch(this._config,this._user,this._pass,this._rid,this._baiduEnterCode);
      }
      
      private function createLogin() : void
      {
         var loader:URLLoader = new URLLoader();
         loader.addEventListener(Event.COMPLETE,this.init);
         var url:URLRequest = new URLRequest("http://192.168.0.10:728/CreateLogin.aspx");
         var obj:URLVariables = new URLVariables();
         var t:uint = new Date().getTime();
         var key:String = "QY-16-WAN-0668-2555555-7ROAD-dandantang-love777";
         obj["content"] = this._user + "|" + this._pass + "|" + String(t) + "|" + MD5.hash(this._user + this._pass + String(t) + key);
         url.data = obj;
         loader.load(url);
      }
   }
}

