package
{
   import asset.loading.CloseButton;
   import asset.loading.SmallLoadingAsset2;
   import flash.display.MovieClip;
   import flash.display.SimpleButton;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.text.TextFieldAutoSize;
   
   [Event(name="complete",type="flash.events.Event")]
   public class SmallLoading extends Sprite
   {
      
      private static var _instance:SmallLoading;
      
      private var _asset:MovieClip = new SmallLoadingAsset2() as MovieClip;
      
      private var _closeBtn:SimpleButton;
      
      private var _showLayer:Sprite;
      
      private var _autoRemoveChild:Boolean;
      
      private var _progress:int;
      
      public function SmallLoading()
      {
         addChild(this._asset);
         this._closeBtn = new CloseButton() as SimpleButton;
         this._closeBtn.x = 255;
         this._closeBtn.y = -145;
         this._asset.addChild(this._closeBtn);
         this._closeBtn.addEventListener(MouseEvent.CLICK,this.__onCloseClick);
         super();
      }
      
      public static function get Instance() : SmallLoading
      {
         if(_instance == null)
         {
            _instance = new SmallLoading();
         }
         return _instance;
      }
      
      private function __onCloseClick(event:MouseEvent) : void
      {
         dispatchEvent(new Event(Event.CLOSE));
      }
      
      public function show(blackGound:Boolean = true, autoRemoveChild:Boolean = true) : void
      {
         this._autoRemoveChild = autoRemoveChild;
         x = 440;
         y = 260;
         this._showLayer.addChild(this);
         if(blackGound)
         {
            graphics.beginFill(0,0.4);
            graphics.drawRect(-2000,-2000,4000,4000);
            graphics.endFill();
         }
         this._asset["txtPercent"].visible = true;
         this._asset["percentIcon"].visible = true;
         this._asset.addFrameScript(23,this.stopMovie);
         this._asset.gotoAndStop("center");
      }
      
      private function stopMovie() : void
      {
         this._asset.stop();
      }
      
      public function hide() : void
      {
         graphics.clear();
         if(Boolean(parent))
         {
            parent.removeChild(this);
         }
      }
      
      public function set progress(p:int) : void
      {
         this._progress = p;
         this._asset["txtPercent"].autoSize = TextFieldAutoSize.RIGHT;
         this._asset["txtPercent"].text = this._progress.toString();
         if(this._progress >= 100)
         {
            dispatchEvent(new Event(Event.COMPLETE));
            this._asset.gotoAndPlay("center");
            this._asset["txtPercent"].visible = false;
            this._asset["percentIcon"].visible = false;
            if(this._autoRemoveChild)
            {
               this.hide();
            }
         }
      }
      
      public function get progress() : int
      {
         return this._progress;
      }
      
      public function setup(layer:Sprite) : void
      {
         this._showLayer = layer;
      }
   }
}

