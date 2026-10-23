package flash.ui
{
   import flash.display.NativeMenuItem;
   
   [native(cls="ContextMenuItemClass",gc="exact",instance="ContextMenuItemObject",methods="auto",construct="check")]
   [Event(name="menuItemSelect",type="flash.events.ContextMenuEvent")]
   public final class ContextMenuItem extends NativeMenuItem
   {
      
      public function ContextMenuItem(caption:String, separatorBefore:Boolean = false, enabled:Boolean = true, visible:Boolean = true)
      {
         super();
         this.caption = caption;
         this.separatorBefore = separatorBefore;
         this.enabled = enabled;
         this.visible = visible;
      }
      
      public native function get caption() : String;
      
      public native function set caption(param1:String) : void;
      
      public native function get separatorBefore() : Boolean;
      
      public native function set separatorBefore(param1:Boolean) : void;
      
      public native function get visible() : Boolean;
      
      public native function set visible(param1:Boolean) : void;
      
      public function clone() : ContextMenuItem
      {
         return new ContextMenuItem(this.caption,this.separatorBefore,this.enabled,this.visible);
      }
   }
}

