package road7th.manager
{
   import flash.display.Bitmap;
   import flash.display.DisplayObject;
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.filters.GlowFilter;
   import flash.geom.Point;
   import flash.utils.setTimeout;
   import road7th.Trainer;
   import road7th.data.EquipType;
   import road7th.data.GameState;
   import road7th.display.LayerType;
   import road7th.events.LivingEvent;
   import road7th.game.TrainGame;
   import road7th.game.model.Box;
   import road7th.game.object.GameCharacter;
   import road7th.game.view.AutoPropEffect;
   import road7th.game.view.countDown.SelfMarkManager;
   import road7th.game.view.prompt.PromptManager;
   import road7th.utils.ClassUtils;
   
   public class StepManager
   {
      
      private static var _instance:StepManager;
      
      public const STEPI:String = "捡武器";
      
      public const STEPII:String = "捡帽子";
      
      public const STEPIII:String = "第一次杀波谷";
      
      public const STEPIV:String = "杀死第一个波谷";
      
      public const STEPV:String = "第二次杀波谷";
      
      public const STEPVI:String = "获得战斗技能";
      
      private var _nowStep:String;
      
      private var _gameView:TrainGame;
      
      private var _trainGameOver:Function;
      
      private var _toolForPick:MovieClip;
      
      private var _overPick:MovieClip;
      
      private var _glow:MovieClip;
      
      private var _btEff:Bitmap;
      
      private var _localLock:Boolean = false;
      
      public function StepManager()
      {
         super();
      }
      
      public static function get Instance() : StepManager
      {
         var _loc1_:* = _instance || new StepManager();
         _instance = _instance || new StepManager();
         return _loc1_;
      }
      
      public function gotoStep(str:String) : void
      {
         switch(str)
         {
            case this.STEPI:
               this._doStepI();
               break;
            case this.STEPII:
               this._doStepII();
               break;
            case this.STEPIII:
               this._doStepIII();
               break;
            case this.STEPIV:
               this._doStepIV();
               break;
            case this.STEPV:
               this._doStepV();
               break;
            case this.STEPVI:
               this._doStepVI();
         }
      }
      
      public function get nowStep() : String
      {
         return this._nowStep;
      }
      
      public function set nowStep(value:String) : void
      {
         this._nowStep = value;
      }
      
      public function set gameView(obj:TrainGame) : void
      {
         this._gameView = obj;
      }
      
      public function get localLock() : Boolean
      {
         return this._localLock;
      }
      
      public function set localLock(value:Boolean) : void
      {
         if(this._localLock == value)
         {
            return;
         }
         this._localLock = value;
      }
      
      private function _doStepI() : void
      {
         this._nowStep = this.STEPI;
         this._gameView.setEnergyViewVis(false);
         KeyManager.Instance.lockKeyNum(KeyManager.VK_SPACE);
         var box:Box = new Box();
         box.name = EquipType.Weapon;
         box.x = 705;
         box.y = 539;
         box.className = "road7th.game.view.goods.TrainerWeapon";
         GameManager.Instance.addBox(box);
         this._gameView.addChild(PromptManager.Instance.build(PromptManager.Instance.SHOW_MOVETO_LEFT));
         GameManager.Instance.Current.selfGamePlayer.addEventListener(LivingEvent.PosChanged,this._posHit);
         this._gameView.selfPlayer.info.direction = -1;
      }
      
      private function _posHit(e:LivingEvent = null) : void
      {
         var eatWeapon:* = null;
         if(Math.abs(GameManager.Instance.Current.selfGamePlayer.pos.x - GameManager.Instance.Current.getbox(EquipType.Weapon).x) < 65)
         {
            GameManager.Instance.pick(EquipType.Weapon,GameManager.Instance.Current.selfGamePlayer);
            GameManager.Instance.Current.selfGamePlayer.removeEventListener(LivingEvent.PosChanged,this._posHit);
            PromptManager.Instance.disposeByID(PromptManager.Instance.SHOW_MOVETO_LEFT);
            SoundManager.instance.play("039");
            eatWeapon = ClassUtils.CreatInstance("asset.game.ghostPcikPropAsset");
            eatWeapon.addFrameScript(12,this.headWeaponEffect);
            eatWeapon.y = -10;
            this._gameView.selfPlayer.addChild(eatWeapon);
            this._gameView.selfPlayer.doAction(GameCharacter.HANDCLIP);
            this._doStepII();
         }
      }
      
      private function _doStepII() : void
      {
         this._nowStep = this.STEPII;
         this._gameView.setEnergyViewVis(false);
         var box:Box = new Box();
         box.name = EquipType.Hat;
         box.x = 868;
         box.y = 539;
         box.className = "road7th.game.view.goods.TrainerEquip";
         GameManager.Instance.addBox(box);
         this._gameView.addChild(PromptManager.Instance.build(PromptManager.Instance.SHOW_MOVETO_RIGHT));
         GameManager.Instance.Current.selfGamePlayer.addEventListener(LivingEvent.PosChanged,this._posHitII);
      }
      
      private function _posHitII(e:LivingEvent = null) : void
      {
         var eatWeapon:* = null;
         if(Math.abs(GameManager.Instance.Current.selfGamePlayer.pos.x - GameManager.Instance.Current.getbox(EquipType.Hat).x) < 10)
         {
            KeyManager.Instance.lockAllKey();
            GameManager.Instance.pick(EquipType.Hat,GameManager.Instance.Current.selfGamePlayer);
            GameManager.Instance.Current.selfGamePlayer.removeEventListener(LivingEvent.PosChanged,this._posHitII);
            PromptManager.Instance.disposeByID(PromptManager.Instance.SHOW_MOVETO_RIGHT);
            SoundManager.instance.play("039");
            eatWeapon = ClassUtils.CreatInstance("asset.game.ghostPcikPropAsset");
            eatWeapon.addFrameScript(12,this.headEquipEffect);
            eatWeapon.y = -10;
            this._gameView.selfPlayer.addChild(eatWeapon);
            this._gameView.selfPlayer.doAction(GameCharacter.HANDCLIP);
            this._doStepIII();
         }
      }
      
      private function headWeaponEffect() : void
      {
         var bitmap:Bitmap = new Bitmap(ClassUtils.CreatInstance("asset.trainer.TrainerWeaponIcon"));
         bitmap.smoothing = true;
         this.headEffect(bitmap);
      }
      
      private function headEquipEffect() : void
      {
         var str:String = Trainer.self.sex == "male" ? "asset.trainer.TrainerManEquipIcon" : "asset.trainer.TrainerWomanEquipIcon";
         var bitmap:Bitmap = new Bitmap(ClassUtils.CreatInstance(str));
         bitmap.smoothing = true;
         this.headEffect(bitmap);
      }
      
      private function headEffect(movie:DisplayObject) : void
      {
         var head:AutoPropEffect = new AutoPropEffect(movie);
         head.x = -5;
         head.y = -140;
         movie.width = 62;
         movie.height = 62;
         this._gameView.selfPlayer.addChild(head);
      }
      
      private function _doStepIII() : void
      {
         this._nowStep = this.STEPIII;
         PromptManager.Instance.show(PromptManager.Instance.SHOW_MISSION_COMPLETE,true,null,this._showCompleteOverIII);
         this._gameView.setEnergyViewVis(true);
      }
      
      private function _showCompleteOverIII() : void
      {
         PromptManager.Instance.show(PromptManager.Instance.SHOW_MISSION_KILLBOGU,true,new Point(0,-50),this._showInfoOverIII);
         GameManager.Instance.addLiving("gà hồng",new Point(1249,640));
      }
      
      private function _showInfoOverIII() : void
      {
         this._gameView.addChild(PromptManager.Instance.build(PromptManager.Instance.SHOW_HOWTO_KILLBOGU_I));
         KeyManager.Instance.openAllKey();
         KeyManager.Instance.lockKeyNum(KeyManager.VK_A);
         KeyManager.Instance.lockKeyNum(KeyManager.VK_D);
         KeyManager.Instance.lockKeyNum(KeyManager.VK_LEFT);
         KeyManager.Instance.lockKeyNum(KeyManager.VK_RIGHT);
         GameManager.Instance.Current.state = GameState.Fight;
         GameManager.Instance.nextTurn();
      }
      
      private function _doStepIV() : void
      {
         this.localLock = true;
         KeyManager.Instance.openUnlockKey();
         KeyManager.Instance.lockKeyNum(KeyManager.VK_SPACE);
         KeyManager.Instance.openKeyNum(KeyManager.VK_A);
         KeyManager.Instance.openKeyNum(KeyManager.VK_D);
         KeyManager.Instance.openKeyNum(KeyManager.VK_LEFT);
         KeyManager.Instance.openKeyNum(KeyManager.VK_RIGHT);
         this._nowStep = this.STEPIV;
         PromptManager.Instance.show(PromptManager.Instance.SHOW_MISSION_COMPLETE,true,null);
      }
      
      private function _doStepV() : void
      {
         this._nowStep = this.STEPV;
         PromptManager.Instance.disposeByID(PromptManager.Instance.SHOW_HOWTO_KILLBOGU_I);
         GameManager.Instance.addLiving("gà hồng",new Point(150,644));
      }
      
      public function boduSpeakII() : void
      {
         this._gameView.addChild(PromptManager.Instance.build(PromptManager.Instance.SHOW_BOGU_SPEAK_II,true,new Point(150,365),this._boguSpeakIIOver));
      }
      
      private function _boguSpeakIIOver() : void
      {
         this._gameView.addChild(PromptManager.Instance.build(PromptManager.Instance.SHOW_HOWTO_KILLBOGU_II));
         GameManager.Instance.Current.selfGamePlayer.focus = false;
         GameManager.Instance.nextTurn();
         this.localLock = false;
      }
      
      private function _doStepVI() : void
      {
         PromptManager.Instance.show(PromptManager.Instance.SHOW_MISSION_COMPLETE,true,null);
         PromptManager.Instance.disposeByID(PromptManager.Instance.SHOW_HOWTO_KILLBOGU_II);
         this.creatToolForPick();
         SelfMarkManager.instance.canDo = false;
      }
      
      private function creatToolForPick() : void
      {
         var pos:Point = null;
         var spr:Sprite = null;
         pos = new Point(200,400);
         this._toolForPick = ClassUtils.CreatInstance("asset.trainer.pickOneAsset") as MovieClip;
         spr = new Sprite();
         spr.graphics.beginFill(0,0.3);
         spr.graphics.drawRect(0,0,1000,600);
         this._toolForPick.buttonMode = true;
         this._toolForPick.spr = spr;
         this._toolForPick.addEventListener(MouseEvent.CLICK,this.__pickTool);
         this._toolForPick.x = pos.x;
         this._toolForPick.y = pos.y;
         this._toolForPick.addEventListener(MouseEvent.MOUSE_OVER,this.__overHandler);
         this._toolForPick.addEventListener(MouseEvent.MOUSE_OUT,this.__outHandler);
         LayerManager.addToLayer(spr,LayerType.Top);
         LayerManager.addToLayer(this._toolForPick,LayerType.Top);
      }
      
      private function __pickTool(e:MouseEvent) : void
      {
         SoundManager.instance.play("008");
         SoundManager.instance.play("157");
         this._toolForPick.removeEventListener(MouseEvent.CLICK,this.__pickTool);
         this._toolForPick.removeEventListener(MouseEvent.MOUSE_OVER,this.__overHandler);
         this._toolForPick.removeEventListener(MouseEvent.MOUSE_OUT,this.__outHandler);
         if(Boolean(this._toolForPick.spr.parent))
         {
            this._toolForPick.spr.parent.removeChild(this._toolForPick.spr);
         }
         this._toolForPick.spr = null;
         if(Boolean(this._toolForPick.parent))
         {
            this._toolForPick.parent.removeChild(this._toolForPick);
         }
         this._toolForPick = null;
         this._overPick = ClassUtils.CreatInstance("asset.trainer.pickOneMove") as MovieClip;
         this._overPick.y = 0;
         this._overPick.x = 0;
         this._overPick.addEventListener(Event.COMPLETE,this._gotoTheEndMc);
         LayerManager.addToLayer(this._overPick,LayerType.Top);
      }
      
      private function __outHandler(event:MouseEvent) : void
      {
         this._toolForPick.filters = null;
      }
      
      private function __overHandler(event:MouseEvent) : void
      {
         this._toolForPick.filters = [new GlowFilter(16737792,1,30,30,2)];
      }
      
      private function _gotoTheEndMc(e:Event) : void
      {
         this._overPick.removeEventListener(Event.COMPLETE,this._gotoTheEndMc);
         this._glow = ClassUtils.CreatInstance("asset.explain.enterGlowTrainer");
         this._glow.buttonMode = true;
         this._glow.x = 425;
         this._glow.y = 494;
         this._glow.addEventListener(MouseEvent.CLICK,this._clickGlow);
         this._glow.addEventListener(MouseEvent.MOUSE_OVER,this._glowOver);
         this._glow.addEventListener(MouseEvent.MOUSE_OUT,this._glowOut);
         this._glow.stop();
         this._btEff = new Bitmap(ClassUtils.CreatInstance("asset.trainer.btEff"));
         this._btEff.x = 425;
         this._btEff.y = 494;
         this._btEff.visible = false;
         setTimeout(this._glowPlay,8000);
         LayerManager.addToLayer(this._btEff,LayerType.Top);
         LayerManager.addToLayer(this._glow,LayerType.Top);
      }
      
      private function _glowPlay() : void
      {
         if(Boolean(this._glow))
         {
            this._glow.play();
         }
      }
      
      private function _glowOver(e:MouseEvent) : void
      {
         this._btEff.visible = true;
      }
      
      private function _glowOut(e:MouseEvent) : void
      {
         this._btEff.visible = false;
      }
      
      private function _clickGlow(e:MouseEvent) : void
      {
         SoundManager.instance.play("008");
         if(Boolean(this._overPick.parent))
         {
            this._overPick.parent.removeChild(this._overPick);
         }
         this._toolForPick = null;
         this._glow.removeEventListener(MouseEvent.CLICK,this._clickGlow);
         this._glow.removeEventListener(MouseEvent.MOUSE_OVER,this._glowOver);
         this._glow.removeEventListener(MouseEvent.MOUSE_OUT,this._glowOut);
         if(Boolean(this._glow.parent))
         {
            this._glow.parent.removeChild(this._glow);
         }
         this._glow = null;
         if(Boolean(this._btEff.bitmapData))
         {
            this._btEff.bitmapData.dispose();
         }
         if(Boolean(this._btEff.parent))
         {
            this._btEff.parent.removeChild(this._btEff);
         }
         this._btEff = null;
         this.gameOver();
      }
      
      public function gameOver() : void
      {
         KeyManager.Instance.lockAllKey();
         GameManager.Instance.Current.selfGamePlayer.isWin = true;
         GameManager.Instance.Current.gameOver();
      }
   }
}

