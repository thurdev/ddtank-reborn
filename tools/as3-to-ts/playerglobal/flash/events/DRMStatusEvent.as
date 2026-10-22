package flash.events
{
   import flash.net.drm.*;
   
   [API("667")]
   public class DRMStatusEvent extends Event
   {
      
      public static const DRM_STATUS:String = "drmStatus";
      
      private var m_detail:String;
      
      private var m_voucher:DRMVoucher;
      
      private var m_metadata:DRMContentData;
      
      private var m_isLocal:Boolean;
      
      public function DRMStatusEvent(type:String = "drmStatus", bubbles:Boolean = false, cancelable:Boolean = false, inMetadata:DRMContentData = null, inVoucher:DRMVoucher = null, inLocal:Boolean = false)
      {
         super(type,bubbles,cancelable);
         this.m_detail = new String("DRM.voucherObtained");
         this.m_voucher = inVoucher;
         this.m_metadata = inMetadata;
         this.m_isLocal = inLocal;
      }
      
      override public function clone() : Event
      {
         return new DRMStatusEvent(type,bubbles,cancelable,this.m_metadata,this.m_voucher,this.m_isLocal);
      }
      
      override public function toString() : String
      {
         return formatToString("DRMStatusEvent","type","bubbles","cancelable");
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
      public function get voucher() : DRMVoucher
      {
         return this.m_voucher;
      }
      
      [API("667")]
      public function set voucher(value:DRMVoucher) : void
      {
         this.m_voucher = value;
      }
      
      [API("667")]
      public function get isLocal() : Boolean
      {
         return this.m_isLocal;
      }
      
      [API("667")]
      public function set isLocal(value:Boolean) : void
      {
         this.m_isLocal = value;
      }
   }
}

