package flash.media
{
   import flash.utils.Dictionary;
   
   [API("688")]
   public class AVCuePoint
   {
      
      private var m_dictionary:Dictionary;
      
      private var m_localTime:Number;
      
      public function AVCuePoint(init_dictionary:Dictionary, init_localTime:Number)
      {
         super();
         this.m_dictionary = init_dictionary;
         this.m_localTime = init_localTime;
      }
      
      public function get dictionary() : Dictionary
      {
         return this.m_dictionary;
      }
      
      public function get localTime() : Number
      {
         return this.m_localTime;
      }
   }
}

