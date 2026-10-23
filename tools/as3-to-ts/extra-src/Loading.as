package
{
   import com.pickgliss.ui.ComponentSetting;
   import com.pickgliss.utils.MD5;
   import flash.display.Loader;
   import flash.display.Sprite;
   import flash.display.StageAlign;
   import flash.display.StageScaleMode;
   import flash.events.ErrorEvent;
   import flash.events.Event;
   import flash.events.IOErrorEvent;
   import flash.external.ExternalInterface;
   import flash.net.URLLoader;
   import flash.net.URLRequest;
   import flash.net.URLVariables;
   import flash.net.sendToURL;
   import flash.system.ApplicationDomain;
   import flash.system.Capabilities;
   import flash.system.LoaderContext;
   
   [SWF(width="1000",height="600",frameRate="25",backgroundColor="#000000")]
   public class Loading extends Sprite
   {
      
      public static const LOADER_TOTAL_NUM:int = 13;
      
      private static const BG:Array = ["images/bg/1.jpg","images/bg/2.jpg","images/bg/3.jpg"];
      
      private var _configLoader:URLLoader;
      
      private var _config:XML;
      
      private var _flashSite:String;
      
      private var _requestPath:String;
      
      private var _user:String = "hwq1259";
      
      private var _pass:String = "123456";
      
      private var _configURL:String = "config.xml";
      
      private var _rid:String = "";
      
      private var _baiduEnterCode:String = "";
      
      private var _md5Loader:URLLoader;
      
      private var _md5URL:String = "";
      
      private var _md5Dic:Object;
      
      public function Loading()
      {
         super();
         this._configURL = "config.xml";
         this._md5URL = "md5.xml";
         if(Boolean(stage))
         {
            this.init();
         }
         else
         {
            addEventListener(Event.ADDED_TO_STAGE,this.init);
         }
      }
      
      public static function sendTo360Agent($config:XML, user:String, type:int) : void
      {
         var enable:Boolean = false;
         var sitePath:String = null;
         var start:Number = NaN;
         var end:Number = NaN;
         var serverID:String = null;
         var ur:URLRequest = null;
         var variable:URLVariables = null;
         if($config.EXTERNAL_INTERFACE_360.hasOwnProperty("@value"))
         {
            enable = $config.EXTERNAL_INTERFACE_360.@enable != "false";
            if(enable)
            {
               sitePath = $config.FILL_PATH.@value;
               start = sitePath.indexOf("server_id=") + 10;
               end = sitePath.indexOf("&uid={uid}");
               serverID = sitePath.slice(start,end);
               ur = new URLRequest($config.EXTERNAL_INTERFACE_360.@value);
               variable = new URLVariables();
               variable["game"] = "ddt";
               variable["server"] = serverID;
               variable["qid"] = user;
               variable["event"] = getEvent(type);
               variable["time"] = new Date().getTime();
               ur.data = variable;
               sendToURL(ur);
            }
         }
      }
      
      private static function getEvent(type:int) : String
      {
         switch(type)
         {
            case 0:
               return "pageload";
            case 1:
               return "beforeloadflash";
            case 2:
               return "flashloaded";
            case 3:
               return "playercreated";
            case 4:
               return "entergame";
            default:
               return "";
         }
      }
      
      private function init(event:Event = null) : void
      {
         stage.align = StageAlign.TOP_LEFT;
         stage.scaleMode = StageScaleMode.EXACT_FIT;
         SmallLoading.Instance.setup(this);
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
         if(Boolean(stage.loaderInfo.parameters["isGuest"]))
         {
            ComponentSetting.ISGUEST = stage.loaderInfo.parameters["isGuest"] == "false" ? false : true;
         }
         if(Boolean(stage.loaderInfo.parameters["config"]) && String(stage.loaderInfo.parameters["config"]).length > 1)
         {
            this._configURL = stage.loaderInfo.parameters["config"];
         }
         this.tellVersion();
         this.loadConfig();
      }
      
      private function tellVersion() : void
      {
         if(ExternalInterface.available)
         {
            ExternalInterface.call("isSafeFlash",String(Capabilities.version.split(" ")[1]));
         }
      }
      
      private function loadConfig() : void
      {
         var loaderContext:LoaderContext = new LoaderContext(false,ApplicationDomain.currentDomain);
         this._configLoader = new URLLoader();
         this._configLoader.addEventListener(Event.COMPLETE,this.__onConfigLoadComplete);
         this._configLoader.load(new URLRequest(this._configURL + "?rnd=" + Math.random().toString()));
      }
      
      private function __onConfigLoadComplete(event:Event) : void
      {
         this._configLoader.removeEventListener(Event.COMPLETE,this.__onConfigLoadComplete);
         this._config = new XML(event.target.data);
         this._requestPath = this._config..config[0].REQUEST_PATH.@value;
         ComponentSetting.FLASHSITE = this._config..config[0].FLASHSITE.@value;
         ComponentSetting.BACKUP_FLASHSITE = this._config..config[0].BACKUP_FLASHSITE.@value;
         ComponentSetting.USEMD5 = this._config..config[0].USE_MD5.@value == "true" ? true : false;
         if(Boolean(stage.loaderInfo.parameters["user"]))
         {
            this._user = stage.loaderInfo.parameters["user"];
         }
         if(ComponentSetting.USEMD5)
         {
            this._md5Loader = new URLLoader();
            this._md5Loader.addEventListener(Event.COMPLETE,this.__onMd5LoadComplete);
            this._md5Loader.addEventListener(IOErrorEvent.IO_ERROR,this.__md5IoErrorHandler);
            this._md5Loader.load(new URLRequest(this._md5URL + "?rnd=" + Math.random().toString()));
         }
         else
         {
            this.loadSelectList();
         }
      }
      
      private function __md5IoErrorHandler(event:IOErrorEvent) : void
      {
         this._md5Loader.removeEventListener(Event.COMPLETE,this.__onMd5LoadComplete);
         this._md5Loader.removeEventListener(IOErrorEvent.IO_ERROR,this.__md5IoErrorHandler);
         if(ExternalInterface.available)
         {
            ExternalInterface.call("alert","load md5.xml have problem");
         }
      }
      
      private function __onMd5LoadComplete(event:Event) : void
      {
         var md5name:String = null;
         var md5:String = null;
         this._md5Loader.removeEventListener(Event.COMPLETE,this.__onMd5LoadComplete);
         this._md5Dic = new Object();
         var xml:XML = XML(event.target.data);
         var xmlList:XMLList = xml..Item;
         for(var i:int = 0; i < xmlList.length(); i++)
         {
            md5name = xmlList[i].@name;
            md5name = md5name.toLowerCase();
            md5 = xmlList[i].@md5;
            this._md5Dic[md5name] = md5;
         }
         ComponentSetting.md5Dic = this._md5Dic;
         this.loadSelectList();
      }
      
      private function loadSelectList() : void
      {
         var variable:URLVariables = new URLVariables();
         variable["username"] = this._user;
         variable["rnd"] = Math.random();
         var request:URLRequest = new URLRequest(this._requestPath + "LoginSelectList.ashx");
         request.data = variable;
         var loader:URLLoader = new URLLoader();
         loader.addEventListener(Event.COMPLETE,this.__onloadSelectListComplete);
         loader.addEventListener(IOErrorEvent.IO_ERROR,this.__onloadSelectListError);
         loader.load(request);
      }
      
      private function __onloadSelectListError(event:IOErrorEvent) : void
      {
         throw new ErrorEvent("SELECTLIST_LOAD_ERROR",true,false,"Load selectList fail! please try again later!");
      }
      
      private function __onloadSelectListComplete(event:Event) : void
      {
         var registerLoading:RegisterLuncher = null;
         var registerLoading1:RegisterLuncher = null;
         var nickname:String = null;
         var sex:Boolean = false;
         var loader:Loader = null;
         var xmllist:XMLList = XML(event.target.data)..Item;
         if(xmllist.length() < 1)
         {
            registerLoading = new RegisterLuncher();
            addChild(registerLoading);
            registerLoading.lunch(this._config,this._user,this._pass,this._rid,this._baiduEnterCode,false,"",true,this._md5Dic);
         }
         else if(xmllist.length() == 1 && xmllist[0].@IsFirst <= 1)
         {
            registerLoading1 = new RegisterLuncher();
            addChild(registerLoading1);
            nickname = xmllist[0].@NickName;
            sex = xmllist[0].@Sex == "true";
            registerLoading1.lunch(this._config,this._user,this._pass,this._rid,this._baiduEnterCode,true,nickname,sex,this._md5Dic);
         }
         else
         {
            loader = new Loader();
            trace(stage.loaderInfo.loaderURL.replace("Loading.swf","DDT_Loading.swf"));
            loader.load(new URLRequest(stage.loaderInfo.loaderURL.replace("Loading.swf","DDT_Loading.swf") + "?rnd=" + Math.random()),new LoaderContext(false,ApplicationDomain.currentDomain));
            addChild(loader);
         }
         sendTo360Agent(this._config..config[0],this._user,1);
      }
      
      private function __loginComplte(event:Event) : void
      {
         event.currentTarget.removeEventListener(Event.COMPLETE,this.__loginComplte);
         this.loadConfig();
      }
      
      private function createLogin() : void
      {
         var loader:URLLoader = new URLLoader();
         loader.addEventListener(Event.COMPLETE,this.__loginComplte);
         var url:URLRequest = new URLRequest("http://test64.ddt.7road-inc.com:728/CreateLogin.aspx");
         var obj:URLVariables = new URLVariables();
         var t:uint = new Date().getTime();
         var key:String = "QY-16-WAN-0668-2555555-7ROAD-dandantang-love777";
         obj["content"] = this._user + "|" + this._pass + "|" + String(t) + "|" + MD5.hash(this._user + this._pass + String(t) + key);
         url.data = obj;
         loader.load(url);
      }
   }
}

