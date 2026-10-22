package register.view
{
   import com.pickgliss.toplevel.StageReferance;
   import com.pickgliss.ui.ComponentFactory;
   import com.pickgliss.ui.controls.BaseButton;
   import com.pickgliss.ui.controls.SimpleBitmapButton;
   import com.pickgliss.ui.core.Disposeable;
   import com.pickgliss.ui.image.MovieImage;
   import com.pickgliss.ui.image.ScaleFrameImage;
   import com.pickgliss.ui.text.FilterFrameText;
   import com.pickgliss.utils.ObjectUtils;
   import com.pickgliss.utils.StringUtils;
   import flash.display.Bitmap;
   import flash.display.DisplayObject;
   import flash.display.Sprite;
   import flash.events.Event;
   import flash.events.FocusEvent;
   import flash.events.MouseEvent;
   import flash.geom.Point;
   import flash.media.Sound;
   import flash.text.TextFieldType;
   import flash.text.TextFormat;
   import flash.utils.getQualifiedClassName;
   import register.RegisterState;
   import register.event.RegisterEvent;
   
   public class RegisterView extends Sprite implements Disposeable
   {
      
      private var _availableName:Boolean;
      
      private var _background:DisplayObject;
      
      private var _buttonBoy:BaseButton;
      
      private var _buttonDisenableFilters:Array;
      
      private var _newEnterGame:SimpleBitmapButton;
      
      private var _oldEnterGame:SimpleBitmapButton;
      
      private var _buttonGirl:BaseButton;
      
      private var _inputNickName:FilterFrameText;
      
      private var _inputValidTF:TextFormat;
      
      private var _inputInvalidTF:TextFormat;
      
      private var _movie:MovieImage;
      
      private var _nickname:String;
      
      private var _nicknameState:FilterFrameText;
      
      private var _nicknameStateImg:ScaleFrameImage;
      
      private var _clearBtn:BaseButton;
      
      private var _nicknameDescription:Bitmap;
      
      private var _sex:Boolean = false;
      
      private var _unavialabledFormat:TextFormat;
      
      private var _pleseInputFormat:TextFormat;
      
      private var _avialabledFormat:TextFormat;
      
      private var _defaultNicknameMsg:String;
      
      private var _defaultNicknameField:FilterFrameText;
      
      private var _inputBg:ScaleFrameImage;
      
      private var _boyShine:MovieImage;
      
      private var _girlShine:MovieImage;
      
      private var _sound:Sound;
      
      public function RegisterView()
      {
         super();
         this.initView();
         this.addEvent();
      }
      
      public function dispose() : void
      {
         this.removeEvent();
         if(Boolean(this._background))
         {
            ObjectUtils.disposeObject(this._background);
            this._background = null;
         }
         if(Boolean(this._newEnterGame))
         {
            ObjectUtils.disposeObject(this._newEnterGame);
            this._newEnterGame = null;
         }
         if(Boolean(this._oldEnterGame))
         {
            ObjectUtils.disposeObject(this._oldEnterGame);
            this._oldEnterGame = null;
         }
         if(Boolean(this._buttonBoy))
         {
            ObjectUtils.disposeObject(this._buttonBoy);
            this._buttonBoy = null;
         }
         if(Boolean(this._buttonGirl))
         {
            ObjectUtils.disposeObject(this._buttonGirl);
            this._buttonGirl = null;
         }
         if(Boolean(this._clearBtn))
         {
            ObjectUtils.disposeObject(this._clearBtn);
            this._clearBtn = null;
         }
         if(Boolean(this._nicknameStateImg))
         {
            ObjectUtils.disposeObject(this._nicknameStateImg);
            this._nicknameStateImg = null;
         }
         if(Boolean(this._inputNickName))
         {
            ObjectUtils.disposeObject(this._inputNickName);
            this._inputNickName = null;
         }
         if(Boolean(this._inputBg))
         {
            ObjectUtils.disposeObject(this._inputBg);
            this._inputBg = null;
         }
         if(Boolean(this._nicknameState))
         {
            ObjectUtils.disposeObject(this._nicknameState);
            this._nicknameState = null;
         }
         if(Boolean(this._boyShine))
         {
            ObjectUtils.disposeObject(this._boyShine);
            this._boyShine = null;
         }
         if(Boolean(this._girlShine))
         {
            ObjectUtils.disposeObject(this._girlShine);
            this._girlShine = null;
         }
         if(Boolean(this._movie))
         {
            ObjectUtils.disposeObject(this._movie);
            this._movie = null;
         }
         this._buttonDisenableFilters = null;
         if(Boolean(parent))
         {
            parent.removeChild(this);
         }
      }
      
      public function get nickname() : String
      {
         return this._inputNickName.text;
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
               this._buttonBoy.enable = false;
               this._buttonGirl.enable = true;
            }
            else if(this._sex == RegisterState.Girl)
            {
               this._buttonBoy.enable = true;
               this._buttonGirl.enable = false;
            }
         }
      }
      
      private function __onAddToStage(evt:Event) : void
      {
         removeEventListener(Event.ADDED_TO_STAGE,this.__onAddToStage);
      }
      
      private function __onTextChange(evt:Event) : void
      {
         this._inputNickName.setTextFormat(this._inputValidTF);
         this._inputBg.setFrame(1);
         if(this._nicknameState.text != this._defaultNicknameMsg)
         {
            this._nicknameState.text = this._defaultNicknameMsg;
            this._nicknameStateImg.visible = false;
            this._nicknameState.defaultTextFormat = this._unavialabledFormat;
            this._nicknameState.setTextFormat(this._pleseInputFormat,0,this._nicknameState.length);
            if(this._nicknameState.numLines > 1)
            {
               this._nicknameState.height = 18 * this._nicknameState.numLines;
               this._nicknameState.y = 492;
            }
            else if(this._nicknameState.numLines == 1)
            {
               this._nicknameState.height = 18;
               this._nicknameState.y = 500;
            }
         }
         if(!this._inputNickName.text || StringUtils.trim(this._inputNickName.text) == "")
         {
            this._newEnterGame.enable = false;
            this._newEnterGame.filters = this._buttonDisenableFilters;
            this._oldEnterGame.enable = false;
            this._oldEnterGame.filters = this._buttonDisenableFilters;
            this._nicknameState.setTextFormat(this._pleseInputFormat,0,this._nicknameState.length);
         }
         else
         {
            this._newEnterGame.enable = true;
            this._newEnterGame.filters = null;
            this._oldEnterGame.enable = true;
            this._oldEnterGame.filters = null;
         }
         this._clearBtn.visible = Boolean(this._inputNickName.text) && this._inputNickName.text != "";
      }
      
      private function addEvent() : void
      {
         addEventListener(Event.ADDED_TO_STAGE,this.__onAddToStage);
         this._newEnterGame.addEventListener(MouseEvent.CLICK,this.newenterGame);
         this._oldEnterGame.addEventListener(MouseEvent.CLICK,this.oldenterGame);
         this._clearBtn.addEventListener(MouseEvent.CLICK,this.clearTxt);
         this._buttonBoy.addEventListener(MouseEvent.CLICK,this.chageSex);
         this._buttonGirl.addEventListener(MouseEvent.CLICK,this.chageSex);
         this._inputNickName.addEventListener(Event.CHANGE,this.__onTextChange);
         this._inputNickName.addEventListener(FocusEvent.FOCUS_OUT,this.__focusOut);
         this._inputNickName.addEventListener(FocusEvent.FOCUS_IN,this.__focusIn);
      }
      
      private function __focusIn(evt:FocusEvent) : void
      {
         this._clearBtn.visible = Boolean(this._inputNickName.text) && this._inputNickName.text != "";
         this._defaultNicknameField.visible = false;
      }
      
      private function __focusOut(evt:FocusEvent) : void
      {
         var arr:Array = null;
         var isClickClearBtn:Boolean = false;
         var img:DisplayObject = null;
         var name:String = null;
         if(StringUtils.trim(this._inputNickName.text) != "")
         {
            arr = stage.getObjectsUnderPoint(new Point(stage.mouseX,stage.mouseY));
            isClickClearBtn = false;
            for each(img in arr)
            {
               if(img is Bitmap)
               {
                  name = getQualifiedClassName(img["bitmapData"]);
                  if(name == "asset.choicefigure::deleteAsset")
                  {
                     isClickClearBtn = true;
                     break;
                  }
               }
            }
            if(!isClickClearBtn)
            {
               dispatchEvent(new Event(RegisterEvent.CheckNickName));
            }
         }
         this._defaultNicknameField.visible = this._inputNickName.text == null || this._inputNickName.text == "";
      }
      
      private function chageSex(evt:MouseEvent) : void
      {
         this._sound.play();
         if(evt.currentTarget == this._buttonBoy)
         {
            if(this._sex != RegisterState.Boy)
            {
               this._sex = RegisterState.Boy;
               this._buttonBoy.enable = false;
               this._buttonGirl.enable = true;
               this._boyShine.visible = true;
               this._girlShine.visible = false;
               this._movie.movie.gotoAndPlay("boy");
               dispatchEvent(new Event(RegisterEvent.ChageSex));
            }
         }
         else if(evt.currentTarget == this._buttonGirl)
         {
            if(this._sex != RegisterState.Girl)
            {
               this._sex = RegisterState.Girl;
               this._buttonBoy.enable = true;
               this._buttonGirl.enable = false;
               this._boyShine.visible = false;
               this._girlShine.visible = true;
               this._movie.movie.gotoAndPlay("girl");
               dispatchEvent(new Event(RegisterEvent.ChageSex));
            }
         }
      }
      
      private function enterGame(evt:MouseEvent) : void
      {
      }
      
      private function newenterGame(evt:MouseEvent) : void
      {
         this._newEnterGame.enable = false;
         this._oldEnterGame.enable = false;
         this._sound.play();
         dispatchEvent(new Event(RegisterEvent.NewEnterGame));
      }
      
      private function oldenterGame(evt:MouseEvent) : void
      {
         this._newEnterGame.enable = false;
         this._oldEnterGame.enable = false;
         this._sound.play();
         dispatchEvent(new Event(RegisterEvent.OldEnterGame));
      }
      
      private function onDown(evt:MouseEvent) : void
      {
      }
      
      private function onup(evt:MouseEvent) : void
      {
      }
      
      private function clearTxt(evt:MouseEvent) : void
      {
         this._sound.play();
         this._inputNickName.text = "";
         this._inputBg.setFrame(1);
         this._clearBtn.visible = false;
         this._inputNickName.setFocus();
         this.__onTextChange(null);
      }
      
      private function initView() : void
      {
         this._buttonDisenableFilters = ComponentFactory.Instance.creatFilters("filter.register.ButtonDisenable");
         this._avialabledFormat = ComponentFactory.Instance.model.getSet("choicefigure.AvialableNickname");
         this._unavialabledFormat = ComponentFactory.Instance.model.getSet("choicefigure.UnavialableNickname");
         this._pleseInputFormat = ComponentFactory.Instance.model.getSet("choicefigure.inputNickname");
         this._inputValidTF = ComponentFactory.Instance.model.getSet("choicefigure.StyleNickname");
         this._inputInvalidTF = ComponentFactory.Instance.model.getSet("choicefigure.StyleNicknameUnvaialabel");
         this._background = ComponentFactory.Instance.creatBitmap("asset.choicefigure.rightBackground");
         addChild(this._background);
         this._movie = ComponentFactory.Instance.creat("asset.chociefigure.selectMovie");
         this._movie.mouseChildren = this._movie.mouseEnabled = false;
         addChild(this._movie);
         this._newEnterGame = ComponentFactory.Instance.creat("choicefigure.ButtonEnterGame.new");
         this._newEnterGame.enable = false;
         addChild(this._newEnterGame);
         this._oldEnterGame = ComponentFactory.Instance.creat("choicefigure.ButtonEnterGame.old");
         this._oldEnterGame.enable = false;
         addChild(this._oldEnterGame);
         this._buttonBoy = ComponentFactory.Instance.creat("choicefigure.ButtonBoy");
         addChild(this._buttonBoy);
         this._buttonGirl = ComponentFactory.Instance.creat("choicefigure.ButtonGirl");
         addChild(this._buttonGirl);
         this._inputBg = ComponentFactory.Instance.creatComponentByStylename("choicefigure.inputBgAsset");
         this._inputBg.setFrame(1);
         addChild(this._inputBg);
         this._inputNickName = ComponentFactory.Instance.creat("choicefigure.InputNickName");
         this._inputNickName.text = "";
         addChild(this._inputNickName);
         this._defaultNicknameField = ComponentFactory.Instance.creat("choicefigure.InputTipName");
         this._defaultNicknameField.type = TextFieldType.DYNAMIC;
         this._defaultNicknameField.visible = this._defaultNicknameField.mouseEnabled = false;
         addChild(this._defaultNicknameField);
         this._nicknameState = ComponentFactory.Instance.creat("choicefigure.NicknameAvailable");
         addChild(this._nicknameState);
         this._clearBtn = ComponentFactory.Instance.creat("choicefigure.clearBtn");
         addChild(this._clearBtn);
         this._clearBtn.visible = false;
         this._nicknameStateImg = ComponentFactory.Instance.creat("choicefigure.checkNameStateAsset");
         addChild(this._nicknameStateImg);
         this._nicknameStateImg.visible = false;
         this._nicknameState.defaultTextFormat = this._unavialabledFormat;
         this._defaultNicknameMsg = this._nicknameState.text;
         this._nicknameState.setTextFormat(this._pleseInputFormat);
         if(!this._inputNickName.text || StringUtils.trim(this._inputNickName.text) == "")
         {
            this._newEnterGame.enable = false;
            this._newEnterGame.filters = this._buttonDisenableFilters;
            this._oldEnterGame.enable = false;
            this._oldEnterGame.filters = this._buttonDisenableFilters;
         }
         else
         {
            this._newEnterGame.enable = true;
            this._newEnterGame.filters = null;
            this._oldEnterGame.enable = true;
            this._oldEnterGame.filters = null;
         }
         this._boyShine = ComponentFactory.Instance.creat("asset.chociefigure.selectBoyShine");
         this._girlShine = ComponentFactory.Instance.creat("asset.chociefigure.selectGirlShine");
         this._boyShine.mouseChildren = this._boyShine.mouseEnabled = this._girlShine.mouseChildren = this._girlShine.mouseEnabled = false;
         addChild(this._boyShine);
         addChild(this._girlShine);
         this._boyShine.visible = this._girlShine.visible = false;
         if(this._sex == RegisterState.Boy)
         {
            this._buttonBoy.enable = false;
            this._buttonGirl.enable = true;
            this._boyShine.visible = true;
            this._movie.movie.gotoAndPlay("boyState");
         }
         else if(this._sex == RegisterState.Girl)
         {
            this._movie.movie.gotoAndPlay("girlState");
            this._buttonBoy.enable = true;
            this._buttonGirl.enable = false;
            this._girlShine.visible = true;
         }
         this._sound = ComponentFactory.Instance.creat("asset.choicefigure.click");
      }
      
      private function removeEvent() : void
      {
         removeEventListener(Event.ADDED_TO_STAGE,this.__onAddToStage);
         this._newEnterGame.removeEventListener(MouseEvent.CLICK,this.newenterGame);
         this._oldEnterGame.removeEventListener(MouseEvent.CLICK,this.oldenterGame);
         this._clearBtn.removeEventListener(MouseEvent.CLICK,this.clearTxt);
         this._buttonBoy.removeEventListener(MouseEvent.CLICK,this.chageSex);
         this._buttonGirl.removeEventListener(MouseEvent.CLICK,this.chageSex);
         this._inputNickName.removeEventListener(Event.CHANGE,this.__onTextChange);
         this._inputNickName.removeEventListener(FocusEvent.FOCUS_OUT,this.__focusOut);
         this._inputNickName.removeEventListener(FocusEvent.FOCUS_IN,this.__focusIn);
      }
      
      public function set niccknameAvailable(val:Boolean) : void
      {
         this._availableName = val;
         if(this._availableName)
         {
            this._nicknameState.defaultTextFormat = this._avialabledFormat;
            this._nicknameState.setTextFormat(this._avialabledFormat,0,this._nicknameState.length);
            this._nicknameStateImg.visible = true;
            this._inputBg.setFrame(1);
            this._inputNickName.setTextFormat(this._inputValidTF);
         }
         else
         {
            this._inputNickName.setTextFormat(this._inputInvalidTF);
            this._nicknameState.defaultTextFormat = this._unavialabledFormat;
            this._nicknameState.setTextFormat(this._unavialabledFormat,0,this._nicknameState.length);
            this._inputBg.setFrame(2);
            this._nicknameStateImg.visible = false;
         }
      }
      
      public function get nicknameAvailable() : Boolean
      {
         return this._availableName;
      }
      
      public function get chknameMsg() : String
      {
         return this._nicknameState.text;
      }
      
      public function set chknameMsg(val:String) : void
      {
         this._nicknameState.text = val;
         if(this._nicknameState.numLines > 1)
         {
            this._nicknameState.height = 18 * this._nicknameState.numLines;
            this._nicknameState.y = 492;
         }
         else if(this._nicknameState.numLines == 1)
         {
            this._nicknameState.height = 18;
            this._nicknameState.y = 500;
         }
      }
      
      public function setFocus() : void
      {
         this.__focusOut(null);
         StageReferance.stage.focus = null;
      }
   }
}

