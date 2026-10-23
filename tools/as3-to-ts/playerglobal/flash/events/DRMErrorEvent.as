package flash.events
{
   import flash.net.drm.*;
   
   [API("667")]
   public class DRMErrorEvent extends ErrorEvent
   {
      
      public static const DRM_ERROR:String = "drmError";
      
      public static const DRM_LOAD_DEVICEID_ERROR:String = "drmLoadDeviceIdError";
      
      private var m_metadata:DRMContentData;
      
      private var m_subErrorID:int;
      
      private var m_systemUpdateNeeded:Boolean;
      
      private var m_drmUpdateNeeded:Boolean;
      
      public function DRMErrorEvent(type:String = "drmError", bubbles:Boolean = false, cancelable:Boolean = false, inErrorDetail:String = "", inErrorCode:int = 0, insubErrorID:int = 0, inMetadata:DRMContentData = null, inSystemUpdateNeeded:Boolean = false, inDrmUpdateNeeded:Boolean = false)
      {
         super(type,bubbles,cancelable,inErrorDetail,inErrorCode);
         this.m_subErrorID = insubErrorID;
         this.m_metadata = inMetadata;
         this.m_systemUpdateNeeded = inSystemUpdateNeeded;
         this.m_drmUpdateNeeded = inDrmUpdateNeeded;
      }
      
      override public function clone() : Event
      {
         return new DRMErrorEvent(type,bubbles,cancelable,text,errorID,this.subErrorID,this.m_metadata,this.m_systemUpdateNeeded,this.m_drmUpdateNeeded);
      }
      
      override public function toString() : String
      {
         return formatToString("DRMErrorEvent","type","bubbles","cancelable","eventPhase","errorID","subErrorID","text","systemUpdateNeeded","drmUpdateNeeded");
      }
      
      public function get subErrorID() : int
      {
         return this.m_subErrorID;
      }
      
      [API("667")]
      public function get contentData() : DRMContentData
      {
         return this.m_metadata;
      }
      
      [API("667")]
      public function set contentData(value:DRMContentData) : void
      {
         this.m_metadata = value;
      }
      
      [API("667")]
      public function get systemUpdateNeeded() : Boolean
      {
         return this.m_systemUpdateNeeded;
      }
      
      [API("667")]
      public function get drmUpdateNeeded() : Boolean
      {
         return this.m_drmUpdateNeeded;
      }
   }
}

