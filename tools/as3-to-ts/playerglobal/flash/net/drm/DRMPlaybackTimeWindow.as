package flash.net.drm
{
   [native(construct="native",friend="DRMVoucherObject")]
   [API("667")]
   public class DRMPlaybackTimeWindow
   {
      
      private var m_length:uint;
      
      private var m_startDate:Date;
      
      private var m_endDate:Date;
      
      public function DRMPlaybackTimeWindow()
      {
         super();
      }
      
      [cppcall]
      private function init(length:Number, start:Number, end:Number) : void
      {
         this.m_length = length;
         if(start > 0)
         {
            this.m_startDate = new Date(start * 1000);
         }
         if(end > 0)
         {
            this.m_endDate = new Date(end * 1000);
         }
      }
      
      public function get period() : uint
      {
         return this.m_length;
      }
      
      public function get startDate() : Date
      {
         return this.m_startDate;
      }
      
      public function get endDate() : Date
      {
         return this.m_endDate;
      }
   }
}

