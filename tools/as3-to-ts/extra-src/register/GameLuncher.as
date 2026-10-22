package register
{
   import com.pickgliss.loader.BaseLoader;
   import com.pickgliss.loader.LoaderEvent;
   import com.pickgliss.loader.LoaderManager;
   import com.pickgliss.loader.ModuleLoader;
   import flash.display.Shape;
   import flash.events.Event;
   import flash.utils.getDefinitionByName;
   
   public class GameLuncher
   {
      
      private static var _coreLoader:ModuleLoader;
      
      private static var _startupLoader:*;
      
      private static var shape:Shape;
      
      private static var SmallLoading:*;
      
      public static var baseURL:String = "";
      
      private static const CorePath:String = "2.png";
      
      private static const CoreProgress:int = 20;
      
      private static const StartProgress:int = 20;
      
      private static var _coreIsComplete:Boolean = false;
      
      private static var _trainComplete:Boolean = false;
      
      private static const CORE_SETUP_COMPLETE:String = "coreSetupLoadComplete";
      
      public function GameLuncher()
      {
         super();
      }
      
      public static function loadCore() : void
      {
         _coreLoader = LoaderManager.Instance.creatLoader(baseURL + CorePath,BaseLoader.MODULE_LOADER);
         _coreLoader.addEventListener(LoaderEvent.COMPLETE,__onCoreLoadComplete);
         LoaderManager.Instance.startLoad(_coreLoader);
      }
      
      private static function __onCoreLoadComplete(event:LoaderEvent) : void
      {
         _coreLoader.removeEventListener(LoaderEvent.COMPLETE,__onCoreLoadComplete);
         _coreIsComplete = true;
         _startupLoader = getDefinitionByName("ddt.loader.StartupResourceLoader");
         _startupLoader.Instance.addEventListener(Event.COMPLETE,__onStartupComplete);
         _startupLoader.Instance.addRegisterUIModule();
         if(_trainComplete)
         {
            enterGame();
         }
      }
      
      private static function __onStartupComplete(event:Event) : void
      {
         _startupLoader.Instance.removeEventListener(Event.COMPLETE,__onStartupComplete);
         shape.removeEventListener(Event.ENTER_FRAME,__updateProgress);
         shape = null;
         if(_trainComplete)
         {
            SmallLoading.Instance.hide();
         }
      }
      
      public static function lunch() : void
      {
         _trainComplete = true;
         if(_coreLoader.isComplete)
         {
            enterGame();
         }
         if(!_coreLoader.isComplete || _startupLoader != null && !_startupLoader.isComplete)
         {
            SmallLoading = getDefinitionByName(RegisterState.SmallLoadingDefinition);
            SmallLoading.Instance.show(true,true);
            SmallLoading.Instance.progress = 0;
            shape = new Shape();
            shape.addEventListener(Event.ENTER_FRAME,__updateProgress);
         }
      }
      
      private static function __updateProgress(event:Event) : void
      {
         try
         {
            SmallLoading.Instance.progress = _startupLoader.Instance.progress;
            if(Boolean(_startupLoader.isComplete))
            {
               SmallLoading.Instance.hide();
            }
         }
         catch(e:Error)
         {
            trace(e.message);
         }
      }
      
      public static function enterGame() : void
      {
         var ddtClass:Class = getDefinitionByName("ddt.DDT") as Class;
         var ddt:* = new ddtClass();
         ddt.lunch(RegisterState.config,RegisterState.user,RegisterState.pass,TrainLuncher.EnterGameMode,RegisterState.rid,RegisterState.baiduEnterCode,TrainLuncher.EnterGameMode);
      }
   }
}

