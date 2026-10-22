package flash.ui
{
   [Version("10")]
   public final class ContextMenuClipboardItems
   {
      
      private var _cut:Boolean = false;
      
      private var _copy:Boolean = false;
      
      private var _paste:Boolean = false;
      
      private var _clear:Boolean = false;
      
      private var _selectAll:Boolean = true;
      
      public function ContextMenuClipboardItems()
      {
         super();
      }
      
      public function get cut() : Boolean
      {
         return this._cut;
      }
      
      public function set cut(val:Boolean) : void
      {
         this._cut = val;
      }
      
      public function get copy() : Boolean
      {
         return this._copy;
      }
      
      public function set copy(val:Boolean) : void
      {
         this._copy = val;
      }
      
      public function get paste() : Boolean
      {
         return this._paste;
      }
      
      public function set paste(val:Boolean) : void
      {
         this._paste = val;
      }
      
      public function get clear() : Boolean
      {
         return this._clear;
      }
      
      public function set clear(val:Boolean) : void
      {
         this._clear = val;
      }
      
      public function get selectAll() : Boolean
      {
         return this._selectAll;
      }
      
      public function set selectAll(val:Boolean) : void
      {
         this._selectAll = val;
      }
      
      [cppcall]
      [Inspectable(environment="none")]
      public function clone() : ContextMenuClipboardItems
      {
         var result:ContextMenuClipboardItems = new ContextMenuClipboardItems();
         result.cut = this.cut;
         result.copy = this.copy;
         result.paste = this.paste;
         result.clear = this.clear;
         result.selectAll = this.selectAll;
         return result;
      }
   }
}

