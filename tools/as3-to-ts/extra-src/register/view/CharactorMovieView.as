package register.view
{
   import com.pickgliss.ui.ComponentFactory;
   import com.pickgliss.ui.core.Disposeable;
   import com.pickgliss.ui.image.MovieImage;
   import com.pickgliss.utils.ObjectUtils;
   import flash.display.Sprite;
   import flash.events.Event;
   import register.RegisterState;
   
   public class CharactorMovieView extends Sprite implements Disposeable
   {
      
      private var _movieCharactorBoy:MovieImage;
      
      private var _movieCharactorGirl:MovieImage;
      
      private var _sex:Boolean = false;
      
      public function CharactorMovieView()
      {
         super();
         this.initView();
         this.addEvent();
      }
      
      public function dispose() : void
      {
         this.removeEvent();
         if(Boolean(this._movieCharactorBoy))
         {
            ObjectUtils.disposeObject(this._movieCharactorBoy);
            this._movieCharactorBoy = null;
         }
         if(Boolean(this._movieCharactorGirl))
         {
            ObjectUtils.disposeObject(this._movieCharactorGirl);
            this._movieCharactorGirl = null;
         }
         if(Boolean(parent))
         {
            parent.removeChild(this);
         }
      }
      
      public function get sex() : Boolean
      {
         return this._sex;
      }
      
      public function set sex(val:Boolean) : void
      {
         if(this._sex != val)
         {
            this._sex = val;
            if(this._sex == RegisterState.Boy)
            {
               this._movieCharactorBoy.visible = true;
               this._movieCharactorBoy.movie.gotoAndPlay(1);
               this._movieCharactorGirl.visible = false;
            }
            else if(this._sex == RegisterState.Girl)
            {
               this._movieCharactorGirl.visible = true;
               this._movieCharactorGirl.movie.gotoAndPlay(1);
               this._movieCharactorBoy.visible = false;
            }
         }
      }
      
      private function __onAddToStage(evt:Event) : void
      {
         removeEventListener(Event.ADDED_TO_STAGE,this.__onAddToStage);
         if(this._sex == RegisterState.Boy)
         {
            this._movieCharactorBoy.visible = true;
            this._movieCharactorBoy.movie.gotoAndPlay(1);
            this._movieCharactorGirl.visible = false;
         }
         else if(this._sex == RegisterState.Girl)
         {
            this._movieCharactorGirl.visible = true;
            this._movieCharactorGirl.movie.gotoAndPlay(1);
            this._movieCharactorBoy.visible = false;
         }
      }
      
      private function addEvent() : void
      {
         addEventListener(Event.ADDED_TO_STAGE,this.__onAddToStage);
      }
      
      private function initView() : void
      {
         this._movieCharactorBoy = ComponentFactory.Instance.creat("choicefigure.MovieCharactorBoy");
         addChild(this._movieCharactorBoy);
         this._movieCharactorBoy.movie.stop();
         this._movieCharactorBoy.visible = false;
         this._movieCharactorGirl = ComponentFactory.Instance.creat("choicefigure.MovieCharactorGirl");
         addChild(this._movieCharactorGirl);
         this._movieCharactorGirl.movie.stop();
         this._movieCharactorGirl.visible = false;
      }
      
      private function removeEvent() : void
      {
         removeEventListener(Event.ADDED_TO_STAGE,this.__onAddToStage);
      }
   }
}

