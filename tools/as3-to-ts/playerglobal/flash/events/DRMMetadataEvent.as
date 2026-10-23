package flash.events
{
   import flash.net.drm.*;
   import flash.utils.ByteArray;
   
   public class DRMMetadataEvent extends Event
   {
      
      public static const DRM_METADATA:String = "drmMetadata";
      
      private var m_timestamp:Number;
      
      private var m_drmMetadata:DRMContentData;
      
      public function DRMMetadataEvent(type:String = "drmMetadata", bubbles:Boolean = false, cancelable:Boolean = false, inMetadata:ByteArray = null, inTimestamp:Number = 0)
      {
         super(type,bubbles,cancelable);
         this.m_drmMetadata = new DRMContentData(inMetadata);
         this.m_timestamp = inTimestamp;
      }
      
      public function get drmMetadata() : DRMContentData
      {
         return this.m_drmMetadata;
      }
      
      public function get timestamp() : Number
      {
         return this.m_timestamp;
      }
   }
}

