package road7th.manager
{
   import flash.display.DisplayObject;
   import flash.display.DisplayObjectContainer;
   import flash.display.Sprite;
   import road7th.core.ddt_internal;
   import road7th.display.LayerType;
   
   use namespace ddt_internal;
   
   public class LayerManager
   {
      
      private static var _gameLayer:Sprite;
      
      private static var _uiLayer:Sprite;
      
      private static var _topLayer:Sprite;
      
      public function LayerManager()
      {
         super();
      }
      
      ddt_internal static function initialize(mainStage:DisplayObjectContainer) : void
      {
         _gameLayer = new Sprite();
         mainStage.addChild(_gameLayer);
         _uiLayer = new Sprite();
         mainStage.addChild(_uiLayer);
         _topLayer = new Sprite();
         mainStage.addChild(_topLayer);
      }
      
      public static function addToLayer(src:DisplayObject, layer:int) : void
      {
         switch(layer)
         {
            case LayerType.Game:
               _gameLayer.addChild(src);
               break;
            case LayerType.UI:
               _uiLayer.addChild(src);
               break;
            case LayerType.Top:
               _topLayer.addChild(src);
         }
      }
   }
}

