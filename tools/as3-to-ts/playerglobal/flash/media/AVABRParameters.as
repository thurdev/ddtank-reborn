package flash.media
{
   [API("688")]
   public class AVABRParameters
   {
      
      public static const AGGRESSIVE:String = "aggressive";
      
      public static const MODERATE:String = "moderate";
      
      public static const CONSERVATIVE:String = "conservative";
      
      private var m_policy:String;
      
      private var m_startBitsPerSecond:int;
      
      private var m_minBitsPerSecond:int;
      
      private var m_maxBitsPerSecond:int;
      
      public function AVABRParameters(init_policy:String, init_startBitsPerSecond:uint, init_minBitsPerSecond:uint, init_maxBitsPerSecond:uint)
      {
         super();
         this.m_policy = init_policy;
         this.m_startBitsPerSecond = init_startBitsPerSecond;
         this.m_minBitsPerSecond = init_minBitsPerSecond;
         this.m_maxBitsPerSecond = init_maxBitsPerSecond;
      }
      
      public function get policy() : String
      {
         return this.m_policy;
      }
      
      public function set policy(val:String) : void
      {
         this.m_policy = val;
      }
      
      public function get startBitsPerSecond() : int
      {
         return this.m_startBitsPerSecond;
      }
      
      public function set startBitsPerSecond(val:int) : *
      {
         this.m_startBitsPerSecond = val;
      }
      
      public function get minBitsPerSecond() : int
      {
         return this.m_minBitsPerSecond;
      }
      
      public function set minBitsPerSecond(val:int) : *
      {
         this.m_minBitsPerSecond = val;
      }
      
      public function get maxBitsPerSecond() : int
      {
         return this.m_maxBitsPerSecond;
      }
      
      public function set maxBitsPerSecond(val:int) : *
      {
         this.m_maxBitsPerSecond = val;
      }
   }
}

