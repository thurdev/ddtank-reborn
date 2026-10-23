package hamster.view
{
   import asset.hamster.hallAsset;
   import com.pickgliss.toplevel.StageReferance;
   import com.pickgliss.ui.core.Disposeable;
   import com.pickgliss.utils.ObjectUtils;
   import flash.display.DisplayObject;
   import flash.display.MovieClip;
   import flash.display.SimpleButton;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.events.TimerEvent;
   import flash.text.TextField;
   import flash.utils.Timer;
   import hamster.CursorManager;
   import hamster.GameController;
   import hamster.events.GameEvent;
   import hamster.manager.PopupTimerManager;
   import hamster.objects.BooGoo;
   import hamster.objects.Hammer;
   
   public class MapView extends Sprite implements Disposeable
   {
      
      private static const BOGU_POS_ARRAY:Array = [{
         "x":115,
         "y":135
      },{
         "x":285,
         "y":125
      },{
         "x":460,
         "y":135
      },{
         "x":200,
         "y":190
      },{
         "x":370,
         "y":190
      },{
         "x":140,
         "y":290
      },{
         "x":285,
         "y":260
      },{
         "x":435,
         "y":290
      }];
      
      private var _mapAsset:MovieClip;
      
      private var _hammer:Hammer;
      
      private var _btnClose:SimpleButton;
      
      private var _boguContainer:Sprite;
      
      private var _bogus:Vector.<BooGoo>;
      
      private var _scoreField:TextField;
      
      private var _popupInterval:Number;
      
      private var _popupTimer:Timer;
      
      private var _isPaused:Boolean;
      
      private var _ctrller:GameController;
      
      private var _popupMgr:PopupTimerManager;
      
      public function MapView(ctrller:GameController)
      {
         super();
         this._ctrller = ctrller;
         this.initView();
         this.addEvent();
      }
      
      private function initView() : void
      {
         var i:int = 0;
         var bogu:BooGoo = null;
         this._mapAsset = new hallAsset();
         addChild(this._mapAsset);
         this._scoreField = this._mapAsset["score_mc"]["scoreTxt"];
         this._scoreField.text = "0";
         this._btnClose = this._mapAsset["close_btn"];
         addChild(this._btnClose);
         this._hammer = new Hammer();
         CursorManager.Instance.show(this._hammer);
         this._boguContainer = new Sprite();
         addChild(this._boguContainer);
         this._bogus = new Vector.<BooGoo>();
         for(i = 0; i < BOGU_POS_ARRAY.length; i++)
         {
            bogu = new BooGoo();
            bogu.x = BOGU_POS_ARRAY[i].x;
            bogu.y = BOGU_POS_ARRAY[i].y;
            this._boguContainer.addChild(bogu);
            this._bogus.push(bogu);
         }
         this._popupMgr = new PopupTimerManager(1500,700,160);
      }
      
      private function setPopupTimer(interval:Number) : void
      {
         if(Boolean(this._popupTimer))
         {
            this._popupTimer.removeEventListener(TimerEvent.TIMER,this.__onPopupTimer);
         }
         this._popupTimer = new Timer(interval);
         this._popupTimer.addEventListener(TimerEvent.TIMER,this.__onPopupTimer);
         this._popupTimer.start();
      }
      
      private function addEvent() : void
      {
         StageReferance.stage.addEventListener(MouseEvent.MOUSE_DOWN,this.__mouseDown);
         this._ctrller.addEventListener(GameEvent.HIT_ADDSCORE,this.__hitAddscore);
         this._ctrller.addEventListener(GameEvent.QUICKEN,this.__quicken);
         this._btnClose.addEventListener(MouseEvent.CLICK,this.__btnCloseClick);
         this._popupMgr.addEventListener(PopupTimerManager.POPUP_TIMER,this.__onPopupTimer);
         this._popupMgr.start();
      }
      
      private function removeEvent() : void
      {
         StageReferance.stage.removeEventListener(MouseEvent.MOUSE_DOWN,this.__mouseDown);
         this._ctrller.removeEventListener(GameEvent.HIT_ADDSCORE,this.__hitAddscore);
         this._ctrller.removeEventListener(GameEvent.QUICKEN,this.__quicken);
         this._btnClose.removeEventListener(MouseEvent.CLICK,this.__btnCloseClick);
         this._popupMgr.removeEventListener(PopupTimerManager.POPUP_TIMER,this.__onPopupTimer);
      }
      
      private function __showComptele(evt:Event) : void
      {
         this._popupMgr.resume();
      }
      
      private function __quicken(evt:GameEvent) : void
      {
         this._popupMgr.quicken();
      }
      
      private function __hitAddscore(evt:GameEvent) : void
      {
         this._scoreField.text = String(evt.paras[0]);
      }
      
      private function __onPopupTimer(evt:Event) : void
      {
         var popupIdx:int = this._ctrller.getPopupIndex();
         this._bogus[popupIdx].showUp();
      }
      
      private function __mouseDown(evt:MouseEvent) : void
      {
         this._hammer.attack();
         this.attackHitTest();
      }
      
      private function __btnCloseClick(eve:MouseEvent) : void
      {
         dispatchEvent(new Event(Event.CLOSE));
      }
      
      private function attackHitTest() : void
      {
         var len:int = int(this._bogus.length);
         for(var i:int = 0; i < len; i++)
         {
            if(this._bogus[i].isShowup && this._bogus[i].hitTestPoint(this._hammer.x,this._hammer.y,true))
            {
               this._bogus[i].whackDown();
               this._ctrller.attackAddScore();
               break;
            }
         }
      }
      
      public function dispose() : void
      {
         var child:DisplayObject = null;
         this.removeEvent();
         CursorManager.Instance.hide();
         if(Boolean(this._mapAsset))
         {
            ObjectUtils.disposeObject(this._mapAsset);
         }
         this._mapAsset = null;
         if(Boolean(this._scoreField))
         {
            ObjectUtils.disposeObject(this._scoreField);
         }
         this._scoreField = null;
         while(this._boguContainer.numChildren > 0)
         {
            child = this._boguContainer.getChildAt(0);
            child.removeEventListener(BooGoo.SHOW_COMPTELE,this.__showComptele);
            ObjectUtils.disposeObject(child);
         }
         if(Boolean(this._boguContainer))
         {
            ObjectUtils.disposeObject(this._boguContainer);
         }
         this._boguContainer = null;
         if(Boolean(parent))
         {
            parent.removeChild(this);
         }
      }
   }
}

