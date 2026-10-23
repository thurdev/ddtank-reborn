package register
{
   import com.hurlant.crypto.rsa.RSAKey;
   import com.pickgliss.ui.AlertManager;
   import com.pickgliss.ui.LayerManager;
   import com.pickgliss.ui.vo.AlertInfo;
   import register.view.MainFigureView;
   
   public class RegisterState
   {
      
      public static var Nickname:String;
      
      public static var RequestPath:String;
      
      public static var LoginPath:String;
      
      public static var SelectedSex:Boolean;
      
      public static var config:XML;
      
      public static var pass:String;
      
      public static var user:String;
      
      public static var RsaKey:RSAKey;
      
      public static var rid:String;
      
      public static var HAS_REGISTERED:Boolean;
      
      public static const Boy:Boolean = true;
      
      public static const DefaultSex:Boolean = false;
      
      public static const Girl:Boolean = false;
      
      public static var TrainerStandalone:Boolean = true;
      
      public static const SmallLoadingDefinition:String = "SmallLoading";
      
      public static var baiduEnterCode:String = "";
      
      public function RegisterState()
      {
         super();
      }
      
      public static function EnterRegisterState($config:XML, $user:String, $pass:String, $rid:String, $baiduEnterCode:String = "", hasRegistered:Boolean = false, nickname:String = "", sex:Boolean = true) : void
      {
         var train:TrainLuncher = null;
         setupAlert();
         HAS_REGISTERED = hasRegistered;
         config = $config;
         user = $user;
         pass = $pass;
         rid = $rid;
         baiduEnterCode = $baiduEnterCode;
         RequestPath = String($config.REQUEST_PATH.@value);
         LoginPath = String($config.LOGIN_PATH.@value);
         TrainerStandalone = String($config.TRAINER_STANDALONE.@value) == "false" ? false : true;
         RsaKey = LoginUtils.generateRsaLoginKey();
         GameLuncher.baseURL = config[0].FLASHSITE.@value;
         if(!hasRegistered)
         {
            enterRegister();
         }
         else
         {
            train = new TrainLuncher();
            train.lunch(LayerManager.Instance.getLayerByType(LayerManager.GAME_BASE_LAYER),config,nickname,sex ? "male" : "female");
         }
      }
      
      private static function setupAlert() : void
      {
         var alertInfo:AlertInfo = new AlertInfo();
         alertInfo.mutiline = true;
         alertInfo.buttonGape = 15;
         alertInfo.autoDispose = true;
         AlertManager.Instance.setup(LayerManager.STAGE_DYANMIC_LAYER,alertInfo);
      }
      
      private static function enterRegister() : void
      {
         var view:MainFigureView = new MainFigureView(config[0].FLASHSITE.@value);
         LayerManager.Instance.addToLayer(view,LayerManager.GAME_BASE_LAYER);
      }
   }
}

