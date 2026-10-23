package flash.display
{
   import flash.media.SoundTransform;
   
   [native(cls="SimpleButtonClass",gc="exact",instance="SimpleButtonObject",methods="auto")]
   public class SimpleButton extends InteractiveObject
   {
      
      public function SimpleButton(upState:DisplayObject = null, overState:DisplayObject = null, downState:DisplayObject = null, hitTestState:DisplayObject = null)
      {
         super();
         if(Boolean(upState))
         {
            this.upState = upState;
         }
         if(Boolean(overState))
         {
            this.overState = overState;
         }
         if(Boolean(downState))
         {
            this.downState = downState;
         }
         if(Boolean(hitTestState))
         {
            this.hitTestState = hitTestState;
         }
         this._updateButton();
      }
      
      private native function _updateButton() : void;
      
      public native function get useHandCursor() : Boolean;
      
      public native function set useHandCursor(param1:Boolean) : void;
      
      public native function get enabled() : Boolean;
      
      public native function set enabled(param1:Boolean) : void;
      
      public native function get trackAsMenu() : Boolean;
      
      public native function set trackAsMenu(param1:Boolean) : void;
      
      public native function get upState() : DisplayObject;
      
      public native function set upState(param1:DisplayObject) : void;
      
      public native function get overState() : DisplayObject;
      
      public native function set overState(param1:DisplayObject) : void;
      
      public native function get downState() : DisplayObject;
      
      public native function set downState(param1:DisplayObject) : void;
      
      public native function get hitTestState() : DisplayObject;
      
      public native function set hitTestState(param1:DisplayObject) : void;
      
      public native function get soundTransform() : SoundTransform;
      
      public native function set soundTransform(param1:SoundTransform) : void;
   }
}

