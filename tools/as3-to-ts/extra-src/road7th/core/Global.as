package road7th.core
{
   import flash.display.BitmapData;
   import flash.display.DisplayObject;
   import flash.display.DisplayObjectContainer;
   import flash.display.Graphics;
   import flash.display.Sprite;
   import flash.display.Stage;
   import flash.events.Event;
   import flash.system.ApplicationDomain;
   import flash.system.LoaderContext;
   import org.aswing.KeyboardManager;
   import road7th.manager.KeyManager;
   import road7th.manager.LayerManager;
   
   use namespace ddt_internal;
   
   public class Global
   {
      
      private static var _srcStage:Stage;
      
      private static var _mainStage:DisplayObjectContainer;
      
      private static var _block:Sprite;
      
      private static var _trainOver:Function;
      
      public static var selfCharacterData:BitmapData;
      
      private static var _stageWidth:int = 0;
      
      private static var _stageHeight:int = 0;
      
      ddt_internal static const Context:LoaderContext = new LoaderContext(false,ApplicationDomain.currentDomain);
      
      public function Global()
      {
         super();
      }
      
      public static function initailize(stage:DisplayObjectContainer, trainOver:Function) : void
      {
         if(_srcStage == null)
         {
            _trainOver = trainOver;
            _srcStage = stage.stage;
            KeyboardManager.getInstance().init(_srcStage);
            _mainStage = new Sprite();
            stage.addChild(_mainStage);
            LayerManager.initialize(_mainStage);
            _srcStage.addEventListener(Event.ENTER_FRAME,__nextFrame);
            KeyManager.Instance.start(_srcStage);
            _block = new Sprite();
         }
      }
      
      public static function trainOver() : void
      {
         if(_trainOver != null)
         {
            _trainOver.apply();
         }
      }
      
      private static function creatBlock() : void
      {
         var pen:Graphics = _block.graphics;
         pen.beginFill(0);
         pen.drawRect(0,0,_stageWidth,_stageHeight);
         pen.endFill();
      }
      
      private static function __nextFrame(event:Event) : void
      {
         if(_srcStage.stageWidth > 0 && _srcStage.stageHeight > 0)
         {
            _stageWidth = _srcStage.stageWidth;
            _stageHeight = _srcStage.stageHeight;
            _srcStage.removeEventListener(Event.ENTER_FRAME,__nextFrame);
            creatBlock();
         }
      }
      
      public static function get block() : DisplayObject
      {
         return _block;
      }
      
      public static function get mainStage() : DisplayObjectContainer
      {
         return _mainStage;
      }
      
      public static function get stageWidth() : int
      {
         return _stageWidth;
      }
      
      public static function get stageHeight() : int
      {
         return _stageHeight;
      }
      
      public static function get stage() : Stage
      {
         return _srcStage;
      }
   }
}

