package flash.ui
{
   public final class ContextMenuBuiltInItems
   {
      
      private var _save:Boolean = true;
      
      private var _zoom:Boolean = true;
      
      private var _quality:Boolean = true;
      
      private var _play:Boolean = true;
      
      private var _loop:Boolean = true;
      
      private var _rewind:Boolean = true;
      
      private var _forwardAndBack:Boolean = true;
      
      private var _print:Boolean = true;
      
      public function ContextMenuBuiltInItems()
      {
         super();
      }
      
      public function get save() : Boolean
      {
         return this._save;
      }
      
      public function set save(val:Boolean) : void
      {
         this._save = val;
      }
      
      public function get zoom() : Boolean
      {
         return this._zoom;
      }
      
      public function set zoom(val:Boolean) : void
      {
         this._zoom = val;
      }
      
      public function get quality() : Boolean
      {
         return this._quality;
      }
      
      public function set quality(val:Boolean) : void
      {
         this._quality = val;
      }
      
      public function get play() : Boolean
      {
         return this._play;
      }
      
      public function set play(val:Boolean) : void
      {
         this._play = val;
      }
      
      public function get loop() : Boolean
      {
         return this._loop;
      }
      
      public function set loop(val:Boolean) : void
      {
         this._loop = val;
      }
      
      public function get rewind() : Boolean
      {
         return this._rewind;
      }
      
      public function set rewind(val:Boolean) : void
      {
         this._rewind = val;
      }
      
      public function get forwardAndBack() : Boolean
      {
         return this._forwardAndBack;
      }
      
      public function set forwardAndBack(val:Boolean) : void
      {
         this._forwardAndBack = val;
      }
      
      public function get print() : Boolean
      {
         return this._print;
      }
      
      public function set print(val:Boolean) : void
      {
         this._print = val;
      }
      
      [Inspectable(environment="none")]
      public function clone() : ContextMenuBuiltInItems
      {
         var result:ContextMenuBuiltInItems = new ContextMenuBuiltInItems();
         result.save = this.save;
         result.zoom = this.zoom;
         result.quality = this.quality;
         result.play = this.play;
         result.loop = this.loop;
         result.rewind = this.rewind;
         result.forwardAndBack = this.forwardAndBack;
         result.print = this.print;
         return result;
      }
   }
}

