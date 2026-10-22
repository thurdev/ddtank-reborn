package flash.events
{
   public class SyncEvent extends Event
   {
      
      public static const SYNC:String = "sync";
      
      private var m_changeList:Array;
      
      public function SyncEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, changeList:Array = null)
      {
         super(type,bubbles,cancelable);
         this.m_changeList = changeList;
      }
      
      override public function clone() : Event
      {
         return new SyncEvent(type,bubbles,cancelable,this.m_changeList);
      }
      
      override public function toString() : String
      {
         return formatToString("SyncEvent","type","bubbles","cancelable","eventPhase","changeList");
      }
      
      public function get changeList() : Array
      {
         return this.m_changeList;
      }
      
      public function set changeList(value:Array) : void
      {
         this.m_changeList = value;
      }
   }
}

