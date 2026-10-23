package road7th.game.view.prompt
{
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.geom.Point;
   import flash.utils.Dictionary;
   import flash.utils.setTimeout;
   import road7th.core.Global;
   import road7th.manager.SoundManager;
   import road7th.utils.ClassUtils;
   
   public class PromptView
   {
      
      private var _viewDic:Dictionary = new Dictionary();
      
      public function PromptView()
      {
         super();
      }
      
      public function showPrompt(num:int, isAutoDispose:Boolean = false, point:Point = null, fun:Function = null) : PromptBaseView
      {
         if(Boolean(this._viewDic[String(num)]))
         {
            this._viewDic[String(num)].dispose();
         }
         var viewBase:PromptBaseView = new PromptBaseView();
         this._viewDic[String(num)] = viewBase;
         viewBase.id = num;
         viewBase.isAutoDispose = isAutoDispose;
         viewBase.point = point;
         viewBase.completeFun = fun;
         viewBase.addEventListener(Event.COMPLETE,this._viewBaseComplete);
         switch(num)
         {
            case PromptManager.Instance.SHOW_MOVETO_LEFT:
            case PromptManager.Instance.SHOW_MOVETO_RIGHT:
               this._buildMoveToView(num,viewBase);
               break;
            case PromptManager.Instance.SHOW_MISSION_COMPLETE:
               this._buildMissionComplete(viewBase);
               break;
            case PromptManager.Instance.SHOW_BOGU_SPEAK_I:
               this._buildBoguSpeak("bắn tui nè, không biết cách bắn hả",viewBase);
               break;
            case PromptManager.Instance.SHOW_MISSION_KILLBOGU:
               this._buildKillBoguInfo(viewBase);
               break;
            case PromptManager.Instance.SHOW_HOWTO_KILLBOGU_I:
               this._buildHowtoKillBogu("asset.trainer.mcEnergy",viewBase);
               break;
            case PromptManager.Instance.SHOW_INFO_YOUCANDO:
               this._buildYouCanDo(viewBase);
               break;
            case PromptManager.Instance.SHOW_INFO_YOUCANNOTDO:
               this._buildYouCanNotDo("đến lượt bạn mới dùng được",viewBase);
               break;
            case PromptManager.Instance.SHOW_BOGU_SPEAK_II:
               this._buildBoguSpeak("Tui đứng xa chút, xem bạn bắn trúng không?",viewBase);
               break;
            case PromptManager.Instance.SHOW_HOWTO_KILLBOGU_II:
               this._buildHowtoKillBogu("asset.trainer.mcBigEnergyAsset",viewBase);
               break;
            case PromptManager.Instance.SHOW_POWER_NOTENOGH:
               this._buildYouCanNotDo("thể lực không đủ",viewBase);
               break;
            case PromptManager.Instance.SHOW_NOTENOGH_MANA:
               this._buildNotEnoghMana(viewBase);
         }
         return viewBase;
      }
      
      public function disposePrompt(num:int) : void
      {
         if(Boolean(this._viewDic[String(num)]))
         {
            this._viewDic[String(num)].dispose();
         }
         this._viewDic[String(num)] = null;
      }
      
      private function _buildMoveToView(num:int, viewBase:PromptBaseView) : void
      {
         viewBase.view = new MoveView(num);
      }
      
      private function _buildMissionComplete(viewBase:PromptBaseView) : void
      {
         viewBase.view = ClassUtils.CreatInstance("game.trainer.achiveAsset");
         viewBase.view.addEventListener(Event.COMPLETE,this._showMissionOKOver);
         viewBase.view.x = Global.stageWidth / 2;
         viewBase.view.y = Global.stageHeight / 2;
         SoundManager.instance.play("018");
      }
      
      private function _showMissionOKOver(e:Event) : void
      {
         MovieClip(e.currentTarget).removeEventListener(Event.COMPLETE,this._showMissionOKOver);
         MovieClip(e.currentTarget).stop();
         if(Boolean(MovieClip(e.currentTarget).parent))
         {
            MovieClip(e.currentTarget).parent.removeChild(MovieClip(e.currentTarget));
         }
      }
      
      private function _buildBoguSpeak(str:String, viewBase:PromptBaseView) : void
      {
         var showOverFunc:Function = null;
         showOverFunc = function():void
         {
            viewBase.view.dispatchEvent(new Event(Event.COMPLETE));
         };
         viewBase.view = ClassUtils.CreatInstance("ChatBall16000Trainer");
         viewBase.view["textFile"].text = str;
         viewBase.view["textFile"].mouseEnabled = false;
         setTimeout(showOverFunc,3000);
      }
      
      private function _buildKillBoguInfo(viewBase:PromptBaseView) : void
      {
         viewBase.view = ClassUtils.CreatInstance("asset.trainer.mcBeatBoguAsset");
         viewBase.view.addEventListener(Event.COMPLETE,this._showKillBoguOver);
      }
      
      private function _showKillBoguOver(e:Event) : void
      {
         MovieClip(e.currentTarget).removeEventListener(Event.COMPLETE,this._showKillBoguOver);
         MovieClip(e.currentTarget).stop();
         if(Boolean(MovieClip(e.currentTarget).parent))
         {
            MovieClip(e.currentTarget).parent.removeChild(MovieClip(e.currentTarget));
         }
      }
      
      private function _buildHowtoKillBogu(str:String, viewBase:PromptBaseView) : void
      {
         viewBase.view = ClassUtils.CreatInstance(str);
      }
      
      private function _buildYouCanDo(viewBase:PromptBaseView) : void
      {
         viewBase.view = ClassUtils.CreatInstance("asset.game.TurnAsset");
      }
      
      private function _buildYouCanNotDo(str:String, viewBase:PromptBaseView) : void
      {
         viewBase.view = new CanNotDoView(str);
      }
      
      private function _buildNotEnoghMana(viewBase:PromptBaseView) : void
      {
         viewBase.view = new NotEnoghMana();
      }
      
      private function _viewBaseComplete(e:Event) : void
      {
         var num:String = String(PromptBaseView(e.currentTarget).id);
         if(Boolean(this._viewDic[num].isAutoDispose))
         {
            this._viewDic[num].dispose();
            this._viewDic[num] = null;
         }
      }
      
      public function dispose() : void
      {
         var item:* = null;
         for each(item in this._viewDic)
         {
            this._viewDic[item].dispose();
         }
      }
   }
}

