package road7th.game.view.prompt
{
   import com.greensock.TimelineLite;
   import com.greensock.TweenLite;
   import flash.display.Bitmap;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.filters.GlowFilter;
   import flash.text.TextField;
   import flash.text.TextFormat;
   import road7th.core.Global;
   import road7th.utils.ClassUtils;
   
   public class CanNotDoView extends Sprite
   {
      
      private var _tipFeild:TextField;
      
      private var _bg:Bitmap;
      
      public function CanNotDoView(str:String)
      {
         super();
         this._init(str);
      }
      
      private function _init(str:String) : void
      {
         var endY:int = 0;
         PromptManager.Instance.isShowYouCanotDo = false;
         this._bg = new Bitmap(ClassUtils.CreatInstance("asset.core.Scale9CornerImage23"));
         this._tipFeild = new TextField();
         this._tipFeild.defaultTextFormat = new TextFormat("Arial",28,16775800,true,null,null,null,null,"center");
         this._tipFeild.filters = [new GlowFilter(0,1,6,6,6,1)];
         this._tipFeild.multiline = true;
         this._tipFeild.wordWrap = true;
         this._tipFeild.autoSize = "center";
         this._tipFeild.text = str;
         this._tipFeild.mouseEnabled = false;
         addChild(this._bg);
         addChild(this._tipFeild);
         this._bg.width = 650;
         this._tipFeild.width = 650;
         this._tipFeild.y = (this._bg.height - this._tipFeild.height) / 2;
         endY = Global.stageHeight / 2 - this.height;
         this.x = (Global.stageWidth - this.width) / 2;
         this.y = (Global.stageHeight + this.height) / 2;
         this.alpha = 0;
         var tweenline:TimelineLite = new TimelineLite({"onComplete":this._tweenOver});
         tweenline.append(TweenLite.to(this,0.5,{
            "y":endY,
            "alpha":1
         }));
         tweenline.append(TweenLite.to(this,1,{}));
         tweenline.append(TweenLite.to(this,0.5,{"alpha":0}));
      }
      
      private function _tweenOver() : void
      {
         dispatchEvent(new Event(Event.COMPLETE));
         PromptManager.Instance.isShowYouCanotDo = true;
      }
      
      public function dispose() : void
      {
         if(Boolean(this._bg) && Boolean(this._bg.bitmapData))
         {
            this._bg.bitmapData.dispose();
         }
         if(Boolean(this._bg.parent))
         {
            this._bg.parent.removeChild(this._bg);
         }
         if(Boolean(this._tipFeild.parent))
         {
            this._tipFeild.parent.removeChild(this._tipFeild);
         }
         this._bg = null;
         this._tipFeild = null;
         if(Boolean(this.parent))
         {
            this.parent.removeChild(this);
         }
      }
   }
}

