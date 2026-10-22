package flash.events
{
   import flash.display.InteractiveObject;
   
   public class ContextMenuEvent extends Event
   {
      
      public static const MENU_ITEM_SELECT:String = "menuItemSelect";
      
      public static const MENU_SELECT:String = "menuSelect";
      
      private var m_mouseTarget:InteractiveObject;
      
      private var m_contextMenuOwner:InteractiveObject;
      
      private var m_isMouseTargetInaccessible:Boolean;
      
      public function ContextMenuEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, mouseTarget:InteractiveObject = null, contextMenuOwner:InteractiveObject = null)
      {
         super(type,bubbles,cancelable);
         this.m_mouseTarget = mouseTarget;
         this.m_contextMenuOwner = contextMenuOwner;
      }
      
      override public function clone() : Event
      {
         return new ContextMenuEvent(type,bubbles,cancelable,this.m_mouseTarget,this.m_contextMenuOwner);
      }
      
      override public function toString() : String
      {
         return formatToString("ContextMenuEvent","type","bubbles","cancelable","eventPhase","mouseTarget","contextMenuOwner");
      }
      
      public function get mouseTarget() : InteractiveObject
      {
         return this.m_mouseTarget;
      }
      
      public function set mouseTarget(value:InteractiveObject) : void
      {
         this.m_mouseTarget = value;
      }
      
      public function get contextMenuOwner() : InteractiveObject
      {
         return this.m_contextMenuOwner;
      }
      
      public function set contextMenuOwner(value:InteractiveObject) : void
      {
         this.m_contextMenuOwner = value;
      }
      
      [Version("10")]
      public function get isMouseTargetInaccessible() : Boolean
      {
         return this.m_isMouseTargetInaccessible;
      }
      
      [Version("10")]
      public function set isMouseTargetInaccessible(value:Boolean) : void
      {
         this.m_isMouseTargetInaccessible = value;
      }
   }
}

