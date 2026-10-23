package flash.ui
{
   import flash.display.NativeMenu;
   import flash.net.URLRequest;
   
   [native(cls="ContextMenuClass",gc="exact",instance="ContextMenuObject",methods="auto",construct="check")]
   [Event(name="menuSelect",type="flash.events.ContextMenuEvent")]
   public final class ContextMenu extends NativeMenu
   {
      
      public function ContextMenu()
      {
         super();
         this.builtInItems = new ContextMenuBuiltInItems();
         this.customItems = new Array();
      }
      
      [API("667")]
      public static function get isSupported() : Boolean
      {
         return _checkSupported();
      }
      
      private static native function _checkSupported() : Boolean;
      
      [cppcall]
      public function hideBuiltInItems() : void
      {
         var items:ContextMenuBuiltInItems = this.builtInItems;
         if(items != null)
         {
            items.save = false;
            items.zoom = false;
            items.quality = false;
            items.play = false;
            items.loop = false;
            items.rewind = false;
            items.forwardAndBack = false;
            items.print = false;
         }
      }
      
      public native function get builtInItems() : ContextMenuBuiltInItems;
      
      public native function set builtInItems(param1:ContextMenuBuiltInItems) : void;
      
      public native function get customItems() : Array;
      
      public native function set customItems(param1:Array) : void;
      
      [Version("10")]
      public native function get link() : URLRequest;
      
      [Version("10")]
      public native function set link(param1:URLRequest) : void;
      
      [Version("10")]
      public native function get clipboardMenu() : Boolean;
      
      [Version("10")]
      public native function set clipboardMenu(param1:Boolean) : void;
      
      [Version("10")]
      public native function get clipboardItems() : ContextMenuClipboardItems;
      
      [Version("10")]
      public native function set clipboardItems(param1:ContextMenuClipboardItems) : void;
      
      private native function cloneLinkAndClipboardProperties(param1:ContextMenu) : void;
      
      public function clone() : ContextMenu
      {
         var result:ContextMenu = new ContextMenu();
         result.builtInItems = this.builtInItems.clone();
         this.cloneLinkAndClipboardProperties(result);
         for(var i:int = 0; i < this.customItems.length; i++)
         {
            result.customItems.push(this.customItems[i].clone());
         }
         return result;
      }
   }
}

