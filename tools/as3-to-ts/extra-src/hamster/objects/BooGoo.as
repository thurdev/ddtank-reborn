package hamster.objects
{
   import asset.hamster.BoguAsset;
   import com.pickgliss.ui.core.Disposeable;
   import com.pickgliss.utils.ObjectUtils;
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.events.Event;
   
   public class BooGoo extends Sprite implements Disposeable
   {
      
      public static const SHOW_COMPTELE:String = "showComptele";
      
      private static const SHOWUP_LABEL:String = "showUp";
      
      private static const WHACKDOWN_LABEL:String = "whackDown";
      
      private var _assetBugo:MovieClip;
      
      private var _stateLabel:String;
      
      public function BooGoo()
      {
         super();
         this.initView();
      }
      
      private function initView() : void
      {
         this._assetBugo = new BoguAsset();
         this._assetBugo.stop();
         addChild(this._assetBugo);
         this._assetBugo.addEventListener(SHOW_COMPTELE,this.__showComptele);
      }
      
      public function get isShowup() : Boolean
      {
         return SHOWUP_LABEL == this._assetBugo.currentLabel;
      }
      
      public function whackDown() : void
      {
         this._assetBugo.gotoAndPlay(WHACKDOWN_LABEL);
      }
      
      public function showUp() : void
      {
         this._assetBugo.gotoAndPlay(SHOWUP_LABEL);
      }
      
      private function __showComptele(evt:Event) : void
      {
         dispatchEvent(new Event(SHOW_COMPTELE));
      }
      
      public function dispose() : void
      {
         this._assetBugo.removeEventListener(SHOW_COMPTELE,this.__showComptele);
         if(Boolean(this._assetBugo))
         {
            ObjectUtils.disposeObject(this._assetBugo);
         }
         this._assetBugo = null;
         if(Boolean(parent))
         {
            parent.removeChild(this);
         }
      }
   }
}

