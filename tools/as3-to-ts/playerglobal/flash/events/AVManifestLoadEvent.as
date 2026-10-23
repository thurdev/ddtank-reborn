package flash.events
{
   import flash.media.*;
   
   [API("688")]
   public class AVManifestLoadEvent extends Event
   {
      
      public static const AV_MANIFEST_LOAD:String = "avManifestLoad";
      
      private var m_result:AVResult;
      
      private var m_userData:int;
      
      private var m_handle:int;
      
      private var m_duration:Number;
      
      public function AVManifestLoadEvent(type:String = "avManifestLoad", bubbles:Boolean = false, cancelable:Boolean = false, inResult:int = 0, inUserData:int = 0, inHandle:int = 0, inDuration:Number = 0)
      {
         super(type,bubbles,cancelable);
         this.m_result = new AVResult(inResult);
         this.m_userData = inUserData;
         this.m_handle = inHandle;
         this.m_duration = inDuration;
      }
      
      public function get result() : AVResult
      {
         return this.m_result;
      }
      
      public function get userData() : int
      {
         return this.m_userData;
      }
      
      public function get handle() : int
      {
         return this.m_handle;
      }
      
      public function get duration() : Number
      {
         return this.m_duration;
      }
   }
}

