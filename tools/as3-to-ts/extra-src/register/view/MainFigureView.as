package register.view
{
   import com.hurlant.crypto.rsa.RSAKey;
   import com.hurlant.math.BigInteger;
   import com.hurlant.util.Base64;
   import com.pickgliss.events.FrameEvent;
   import com.pickgliss.loader.BaseLoader;
   import com.pickgliss.loader.LoaderEvent;
   import com.pickgliss.loader.LoaderManager;
   import com.pickgliss.loader.RequestLoader;
   import com.pickgliss.loader.UIModuleLoader;
   import com.pickgliss.ui.AlertManager;
   import com.pickgliss.ui.ComponentFactory;
   import com.pickgliss.ui.LayerManager;
   import com.pickgliss.ui.controls.alert.BaseAlerFrame;
   import com.pickgliss.ui.core.Disposeable;
   import com.pickgliss.utils.MD5;
   import com.pickgliss.utils.ObjectUtils;
   import flash.display.Loader;
   import flash.display.Sprite;
   import flash.events.ErrorEvent;
   import flash.events.Event;
   import flash.net.URLRequest;
   import flash.net.URLVariables;
   import flash.net.navigateToURL;
   import flash.system.ApplicationDomain;
   import flash.system.LoaderContext;
   import flash.utils.ByteArray;
   import flash.utils.getDefinitionByName;
   import flash.utils.setTimeout;
   import register.RegisterState;
   import register.TrainLuncher;
   import register.event.RegisterEvent;
   
   public class MainFigureView extends Sprite implements Disposeable
   {
      
      private static const Version:int = 2612558;
      
      public static var RegisterNickname:String = "";
      
      private static var baseURL:String = "";
      
      private var _progress:int = 0;
      
      private var train:TrainLuncher = new TrainLuncher();
      
      private var _agentId:int = 4;
      
      private var _charactorView:CharactorMovieView;
      
      private var _checkNicknameComplete:Boolean;
      
      private var _mainLoading:*;
      
      private var _registerView:RegisterView;
      
      private var _startupLoader:*;
      
      private var _zoneName:String;
      
      private var SmallLoading:*;
      
      private var site:String = "";
      
      private var loader:Loader;
      
      private var _creatLoginComplete:Boolean = false;
      
      private var _creatCharacterComplete:Boolean = false;
      
      public function MainFigureView($baseURL:String)
      {
         super();
         baseURL = $baseURL;
         this.train.startLoad(RegisterState.config);
         this.initView();
         this.loadServerList();
         this.addEvent();
      }
      
      public function dispose() : void
      {
         this.removeEvent();
         this._startupLoader = null;
         if(Boolean(this._registerView))
         {
            ObjectUtils.disposeObject(this._registerView);
         }
         this._registerView = null;
         if(Boolean(this._charactorView))
         {
            ObjectUtils.disposeObject(this._charactorView);
         }
         this._charactorView = null;
         if(Boolean(parent))
         {
            parent.removeChild(this);
         }
      }
      
      private function __chageSex(evt:Event) : void
      {
         RegisterState.SelectedSex = this._registerView.sex;
      }
      
      private function __checkNickname(evt:Event) : void
      {
         this.loadCheckNickname(this.__onCheckNicknameComplete);
      }
      
      private function __enterGame(evt:Event) : void
      {
         this.loadCheckNickname(this.__onEnterGameCheckNicknameComplete);
      }
      
      private function __newenterGame(evt:Event) : void
      {
         TrainLuncher.EnterGameMode = 1;
         this.loadCheckNickname(this.__onEnterGameCheckNicknameComplete);
      }
      
      private function __oldenterGame(evt:Event) : void
      {
         TrainLuncher.EnterGameMode = 2;
         this.loadCheckNickname(this.__onEnterGameCheckNicknameComplete);
      }
      
      private function __mainLoadingHideComplete(event:Event) : void
      {
         this.dispose();
         this._mainLoading.removeEventListener(Event.COMPLETE,this.__mainLoadingHideComplete);
         this._mainLoading.show();
      }
      
      private function __onAddToStage(evt:Event) : void
      {
         this._registerView.setFocus();
         this.site = Boolean(stage.loaderInfo.parameters["site"]) ? stage.loaderInfo.parameters["site"] : "";
      }
      
      private function __onCheckNicknameComplete(event:LoaderEvent) : void
      {
         if(!this._registerView)
         {
            return;
         }
         var xml:XML = new XML(event.loader.content);
         if(String(xml.@value) == "true")
         {
            this._checkNicknameComplete = true;
            this._registerView.niccknameAvailable = true;
            this._registerView.chknameMsg = String(xml.@message);
         }
         else
         {
            this._registerView.niccknameAvailable = false;
            this._registerView.chknameMsg = String(xml.@message);
         }
      }
      
      private function __onEnterGameCheckNicknameComplete(event:LoaderEvent) : void
      {
         event.loader.removeEventListener(LoaderEvent.COMPLETE,this.__onEnterGameCheckNicknameComplete);
         event.loader.removeEventListener(LoaderEvent.COMPLETE,this.__onCheckNicknameComplete);
         event.loader.removeEventListener(LoaderEvent.LOAD_ERROR,this.__onLoadCheckNickError);
         var xml:XML = new XML(event.loader.content);
         if(String(xml.@value) == "true")
         {
            this._checkNicknameComplete = true;
            this._registerView.niccknameAvailable = true;
            this.creatLogin();
            setTimeout(this.creatCharacter,500);
         }
         else
         {
            this._checkNicknameComplete = false;
            this._registerView.niccknameAvailable = false;
         }
         this._registerView.chknameMsg = String(xml.@message);
      }
      
      private function __onLoadCheckNickError(event:LoaderEvent) : void
      {
         event.loader.removeEventListener(LoaderEvent.COMPLETE,this.__onCheckNicknameComplete);
         event.loader.removeEventListener(LoaderEvent.COMPLETE,this.__onEnterGameCheckNicknameComplete);
         event.loader.removeEventListener(LoaderEvent.LOAD_ERROR,this.__onLoadCheckNickError);
         throw new ErrorEvent("加载失败",false,false,"加载昵称检查失败\n" + event.loader.url);
      }
      
      private function __onLoadServerListComplete(event:LoaderEvent) : void
      {
         event.loader.removeEventListener(LoaderEvent.COMPLETE,this.__onLoadServerListComplete);
         event.loader.removeEventListener(LoaderEvent.LOAD_ERROR,this.__onServerListLoadError);
         var result:XML = new XML(event.loader.content);
         this._agentId = result.@agentId;
         this._zoneName = result.@AreaName;
      }
      
      private function __onServerListLoadError(event:LoaderEvent) : void
      {
         event.loader.removeEventListener(LoaderEvent.COMPLETE,this.__onLoadServerListComplete);
         event.loader.removeEventListener(LoaderEvent.LOAD_ERROR,this.__onServerListLoadError);
         throw new ErrorEvent("加载失败",false,false,"加载服务器列表失败\n" + event.loader.url);
      }
      
      private function __onStartupComplete(event:Event) : void
      {
         removeEventListener(Event.ENTER_FRAME,this.__updateProgress);
         this._startupLoader.Instance.removeEventListener(Event.COMPLETE,this.__onStartupComplete);
         this._mainLoading.addEventListener(Event.COMPLETE,this.__mainLoadingHideComplete);
         this._mainLoading.hide();
      }
      
      private function __updateProgress(event:Event) : void
      {
         if(Boolean(this._startupLoader))
         {
            this._mainLoading.progress = this._startupLoader.Instance.progress;
         }
      }
      
      private function addEvent() : void
      {
         this._registerView.addEventListener(RegisterEvent.ChageSex,this.__chageSex);
         this._registerView.addEventListener(RegisterEvent.CheckNickName,this.__checkNickname);
         this._registerView.addEventListener(RegisterEvent.EnterGame,this.__enterGame);
         this._registerView.addEventListener(RegisterEvent.NewEnterGame,this.__newenterGame);
         this._registerView.addEventListener(RegisterEvent.OldEnterGame,this.__oldenterGame);
         addEventListener(Event.ADDED_TO_STAGE,this.__onAddToStage);
      }
      
      private function addMainLoading() : void
      {
         var loadingClass:Class = null;
         if(ApplicationDomain.currentDomain.hasDefinition("loading.MainLoading"))
         {
            loadingClass = getDefinitionByName("loading.MainLoading") as Class;
            this._mainLoading = new loadingClass();
            LayerManager.Instance.addToLayer(this._mainLoading,LayerManager.STAGE_DYANMIC_LAYER);
            addEventListener(Event.ENTER_FRAME,this.__updateProgress);
         }
         else
         {
            this.loadMainLoadingAsset();
         }
      }
      
      private function loadMainLoadingAsset() : void
      {
         if(Boolean(this.loader))
         {
            this.loader.contentLoaderInfo.addEventListener(Event.COMPLETE,this.onComplete);
         }
      }
      
      private function onComplete(evt:Event) : void
      {
         evt.target.removeEventListener(Event.COMPLETE,this.onComplete);
         this.addMainLoading();
      }
      
      private function drawLayer() : void
      {
      }
      
      private function enterGame() : void
      {
         var ddtClass:Class = getDefinitionByName("ddt.DDT") as Class;
         var ddt:* = new ddtClass();
         ddt.lunch(RegisterState.config,RegisterState.user,RegisterState.pass,1,RegisterState.rid,RegisterState.baiduEnterCode);
         getDefinitionByName("Loading").sendTo360Agent(RegisterState.config,RegisterState.user,3);
      }
      
      private function initView() : void
      {
         this._registerView = ComponentFactory.Instance.creatCustomObject("register.view.RegisterView");
         addChild(this._registerView);
         if(!RegisterState.TrainerStandalone)
         {
            this.loader = new Loader();
            this.loader.load(new URLRequest(UIModuleLoader.Instance.baseUrl + "DDT_Loading.swf?rnd=" + Math.random()),new LoaderContext(false,ApplicationDomain.currentDomain));
         }
      }
      
      private function loadCheckNickname(callBack:Function) : void
      {
         var args:URLVariables = new URLVariables();
         args["NickName"] = RegisterState.Nickname = this._registerView.nickname;
         args["rnd"] = Math.random();
         args["enterMode"];
         var loader:RequestLoader = LoaderManager.Instance.creatLoader(RegisterState.RequestPath + "NickNameCheck.ashx",BaseLoader.REQUEST_LOADER,args);
         loader.addEventListener(LoaderEvent.COMPLETE,callBack);
         loader.addEventListener(LoaderEvent.LOAD_ERROR,this.__onLoadCheckNickError);
         LoaderManager.Instance.startLoad(loader);
      }
      
      private function creatLogin() : void
      {
         var w:String = "abcdefghijklmnopqrstuvwxyz";
         var m1:String = "zRSdzFcnZjOCxDMkWUbuRgiOZIQlk7frZMhElQ0a7VqZI9VgU3+lwo0ghZLU3Gg63kOY2UyJ5vFpQdwJUQydsF337ZAUJz4rwGRt/MNL70wm71nGfmdPv4ING+DyJ3ZxFawwE1zSMjMOqQtY4IV8his/HlgXuUfIHVDK87nMNLc=";
         var m2:String = "AQAB";
         var key:RSAKey = this.generateRsaKey(m1,m2);
         var date:Date = new Date();
         var temp:ByteArray = new ByteArray();
         temp.writeShort(date.fullYearUTC);
         temp.writeByte(date.monthUTC + 1);
         temp.writeByte(date.dateUTC);
         temp.writeByte(date.hoursUTC);
         temp.writeByte(date.minutesUTC);
         temp.writeByte(date.secondsUTC);
         var tempPassword:String = "";
         for(var i:int = 0; i < 6; i++)
         {
            tempPassword += w.charAt(int(Math.random() * 26));
         }
         var u:String = RegisterState.user;
         var pass:String = RegisterState.pass;
         temp.writeUTFBytes(RegisterState.user + "," + RegisterState.pass + "," + tempPassword + "," + "");
         var p:String = this.rsaEncry4(key,temp);
         var variables:URLVariables = this.creatWidthKey(false);
         variables["p"] = p;
         variables["v"] = Version;
         variables["site"] = this.site;
         variables["rid"] = RegisterState.rid;
         var loader:RequestLoader = LoaderManager.Instance.creatLoader(RegisterState.RequestPath + "Login.ashx",BaseLoader.REQUEST_LOADER,variables);
         loader.addEventListener(LoaderEvent.LOAD_ERROR,this.__onLoadLoginError);
         loader.addEventListener(LoaderEvent.COMPLETE,this.__onLoadLoginComplete);
         LoaderManager.Instance.startLoad(loader);
         RegisterState.pass = tempPassword;
      }
      
      private function creatCharacter() : void
      {
         var args:URLVariables = this.creatWidthKey(true);
         args["Sex"] = RegisterState.SelectedSex;
         args["NickName"] = RegisterState.Nickname;
         args["Name"] = RegisterState.user;
         args["Pass"] = RegisterState.pass;
         args["site"] = this.site;
         var loader:RequestLoader = LoaderManager.Instance.creatLoader(RegisterState.RequestPath + "VisualizeRegister.ashx",BaseLoader.REQUEST_LOADER,args);
         loader.addEventListener(LoaderEvent.LOAD_ERROR,this.__onCreatCharacterError);
         loader.addEventListener(LoaderEvent.COMPLETE,this.__onCreatCharacterComplete);
         LoaderManager.Instance.startLoad(loader);
      }
      
      private function __onLoadLoginError(evt:LoaderEvent) : void
      {
         var alert:BaseAlerFrame = AlertManager.Instance.simpleAlert("Cảnh cáo","登录已失效，请重新登录","","",true,false,false,LayerManager.ALPHA_BLOCKGOUND);
         alert.addEventListener(FrameEvent.RESPONSE,this.onResponse);
      }
      
      private function __onLoadLoginComplete(evt:LoaderEvent) : void
      {
         var alert:BaseAlerFrame = null;
         var xml:XML = new XML(evt.loader.content);
         if(xml.@value == "false")
         {
            alert = AlertManager.Instance.simpleAlert("Cảnh cáo",xml.@message,"","",true,false,false,LayerManager.ALPHA_BLOCKGOUND);
            alert.addEventListener(FrameEvent.RESPONSE,this.onResponse);
         }
         else
         {
            this._creatLoginComplete = true;
            this.tryEnter();
         }
      }
      
      private function __onCreatCharacterError(evt:LoaderEvent) : void
      {
         var alert:BaseAlerFrame = AlertManager.Instance.simpleAlert("Cảnh cáo","注册形象失败","","",true,false,false,LayerManager.ALPHA_BLOCKGOUND);
         alert.addEventListener(FrameEvent.RESPONSE,this.onResponse);
      }
      
      private function __onCreatCharacterComplete(evt:LoaderEvent) : void
      {
         var xml:XML = new XML(evt.loader.content);
         if(xml.@value == "false")
         {
            this._registerView.chknameMsg = String(xml.@message);
         }
         else
         {
            this._creatCharacterComplete = true;
            this.tryEnter();
         }
      }
      
      private function onResponse(event:FrameEvent) : void
      {
         event.currentTarget.removeEventListener(FrameEvent.RESPONSE,this.onResponse);
         ObjectUtils.disposeObject(event.currentTarget);
         navigateToURL(new URLRequest(RegisterState.LoginPath),"_self");
      }
      
      private function onResponse1(event:FrameEvent) : void
      {
         event.currentTarget.removeEventListener(FrameEvent.RESPONSE,this.onResponse1);
         ObjectUtils.disposeObject(event.currentTarget);
      }
      
      private function rsaEncry4(rsa:RSAKey, src:ByteArray) : String
      {
         var dData:ByteArray = new ByteArray();
         rsa.encrypt(src,dData,src.length);
         return Base64.encodeByteArray(dData);
      }
      
      private function generateRsaKey(m:String, e:String) : RSAKey
      {
         return this.generateRsaKey2(Base64.decodeToByteArray(m),Base64.decodeToByteArray(e));
      }
      
      private function generateRsaKey2(m:ByteArray, e:ByteArray) : RSAKey
      {
         var mi:BigInteger = new BigInteger(m);
         var ei:BigInteger = new BigInteger(e);
         return new RSAKey(mi,ei.intValue());
      }
      
      private function creatWidthKey(mustNew:Boolean) : URLVariables
      {
         var data:URLVariables = new URLVariables();
         data["selfid"] = "";
         data["key"] = MD5.hash(RegisterState.pass);
         if(mustNew)
         {
            data["rnd"] = Math.random();
         }
         return data;
      }
      
      private function loadServerList() : void
      {
         var loader:BaseLoader = LoaderManager.Instance.creatLoader(RegisterState.RequestPath + "ServerList.ashx",BaseLoader.REQUEST_LOADER);
         loader.addEventListener(LoaderEvent.COMPLETE,this.__onLoadServerListComplete);
         loader.addEventListener(LoaderEvent.LOAD_ERROR,this.__onServerListLoadError);
         LoaderManager.Instance.startLoad(loader);
      }
      
      private function removeEvent() : void
      {
         this._registerView.removeEventListener(RegisterEvent.ChageSex,this.__chageSex);
         this._registerView.removeEventListener(RegisterEvent.CheckNickName,this.__checkNickname);
         this._registerView.removeEventListener(RegisterEvent.EnterGame,this.__enterGame);
         this._registerView.removeEventListener(RegisterEvent.NewEnterGame,this.__newenterGame);
         this._registerView.removeEventListener(RegisterEvent.OldEnterGame,this.__oldenterGame);
      }
      
      private function enterTrain() : void
      {
         var nickname:String = RegisterState.Nickname;
         var sex:String = RegisterState.SelectedSex ? "male" : "female";
         this.train.lunch(LayerManager.Instance.getLayerByType(LayerManager.GAME_BASE_LAYER),RegisterState.config,nickname,sex);
         getDefinitionByName("Loading").sendTo360Agent(RegisterState.config,RegisterState.user,3);
      }
      
      private function tryEnter() : void
      {
         if(this._checkNicknameComplete && this._creatLoginComplete && this._creatCharacterComplete)
         {
            if(RegisterState.TrainerStandalone)
            {
               this.enterTrain();
               this.dispose();
            }
            else
            {
               this.addMainLoading();
               this.enterGame();
               this.dispose();
            }
         }
      }
   }
}

