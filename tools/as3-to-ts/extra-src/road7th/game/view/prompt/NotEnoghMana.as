package road7th.game.view.prompt
{
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.utils.setTimeout;
   import road7th.utils.ClassUtils;
   
   public class NotEnoghMana extends Sprite
   {
      
      private var _bg:MovieClip;
      
      public function NotEnoghMana()
      {
         super();
         this._bg = ClassUtils.CreatInstance("asset.trainer.txtPowerStrip");
         addChild(this._bg);
         setTimeout(this.func,5000);
      }
      
      public function func() : void
      {
         dispatchEvent(new Event(Event.COMPLETE));
      }
      
      public function dispose() : void
      {
         if(Boolean(this._bg.parent))
         {
            this._bg.parent.removeChild(this._bg);
         }
         this._bg = null;
      }
   }
}

