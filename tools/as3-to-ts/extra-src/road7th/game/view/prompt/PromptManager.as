package road7th.game.view.prompt
{
   import flash.display.DisplayObject;
   import flash.geom.Point;
   import road7th.display.LayerType;
   import road7th.manager.LayerManager;
   
   public class PromptManager
   {
      
      private static var _instance:PromptManager;
      
      public const SHOW_MOVETO_LEFT:int = 0;
      
      public const SHOW_MOVETO_RIGHT:int = 1;
      
      public const SHOW_MISSION_COMPLETE:int = 2;
      
      public const SHOW_BOGU_SPEAK_I:int = 3;
      
      public const SHOW_MISSION_KILLBOGU:int = 4;
      
      public const SHOW_HOWTO_KILLBOGU_I:int = 5;
      
      public const SHOW_INFO_YOUCANDO:int = 6;
      
      public const SHOW_INFO_YOUCANNOTDO:int = 7;
      
      public const SHOW_BOGU_SPEAK_II:int = 8;
      
      public const SHOW_HOWTO_KILLBOGU_II:int = 9;
      
      public const SHOW_POWER_NOTENOGH:int = 10;
      
      public const SHOW_NOTENOGH_MANA:int = 11;
      
      public var isShowYouCanotDo:Boolean = true;
      
      private var _viewFct:PromptView;
      
      public function PromptManager()
      {
         super();
      }
      
      public static function get Instance() : PromptManager
      {
         var _loc1_:* = _instance || new PromptManager();
         _instance = _instance || new PromptManager();
         return _loc1_;
      }
      
      public function show(num:int, isAutoDispose:Boolean = false, xypoint:Point = null, callbackFun:Function = null) : void
      {
         if(num == this.SHOW_INFO_YOUCANNOTDO && !this.isShowYouCanotDo)
         {
            return;
         }
         if(!this._viewFct)
         {
            this._viewFct = new PromptView();
         }
         var promptView:PromptBaseView = this._viewFct.showPrompt(num,isAutoDispose,xypoint,callbackFun);
         LayerManager.addToLayer(promptView.view,LayerType.Top);
      }
      
      public function build(num:int, isAutoDispose:Boolean = false, xypoint:Point = null, callbackFun:Function = null) : DisplayObject
      {
         if(!this._viewFct)
         {
            this._viewFct = new PromptView();
         }
         var promptView:PromptBaseView = this._viewFct.showPrompt(num,isAutoDispose,xypoint,callbackFun);
         return promptView.view;
      }
      
      public function disposeByID(num:int) : void
      {
         this._viewFct.disposePrompt(num);
      }
      
      public function dispose() : void
      {
         this._viewFct.dispose();
      }
   }
}

