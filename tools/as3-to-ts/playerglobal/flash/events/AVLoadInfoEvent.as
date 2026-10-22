package flash.events
{
   import flash.utils.Dictionary;
   
   [API("688")]
   public class AVLoadInfoEvent extends Event
   {
      
      public static const AV_LOAD_INFO:* = "avLoadInfo";
      
      private var m_loadInfo:Dictionary;
      
      public function AVLoadInfoEvent(type:String = "avLoadInfo", bubbles:Boolean = false, cancelable:Boolean = false, inLoadInfo:Dictionary = null)
      {
         super(type,bubbles,cancelable);
         this.m_loadInfo = inLoadInfo;
      }
      
      public function get loadInfo() : Dictionary
      {
         return this.m_loadInfo;
      }
   }
}

