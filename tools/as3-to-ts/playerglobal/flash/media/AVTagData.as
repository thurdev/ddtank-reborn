package flash.media
{
   [API("688")]
   public class AVTagData
   {
      
      private var m_data:String;
      
      private var m_localTime:Number;
      
      public function AVTagData(init_data:String, init_localTime:Number)
      {
         super();
         this.m_data = init_data;
         this.m_localTime = init_localTime;
      }
      
      public function get data() : String
      {
         return this.m_data;
      }
      
      public function get localTime() : Number
      {
         return this.m_localTime;
      }
   }
}

