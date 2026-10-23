package flash.media
{
   [API("688")]
   public class AVABRProfileInfo
   {
      
      private var m_bitsPerSecond:int;
      
      private var m_width:int;
      
      private var m_height:int;
      
      public function AVABRProfileInfo(init_bitsPerSecond:int, init_width:int, init_height:int)
      {
         super();
         this.m_bitsPerSecond = init_bitsPerSecond;
         this.m_width = init_width;
         this.m_height = init_height;
      }
      
      public function get bitsPerSecond() : int
      {
         return this.m_bitsPerSecond;
      }
      
      public function get width() : int
      {
         return this.m_width;
      }
      
      public function get height() : int
      {
         return this.m_height;
      }
   }
}

