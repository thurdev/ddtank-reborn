package flash.events
{
   import flash.utils.Dictionary;
   
   [API("692")]
   public class AVDictionaryDataEvent extends Event
   {
      
      public static const AV_DICTIONARY_DATA:String = "avDictionaryData";
      
      private var m_dictionary:Dictionary;
      
      private var m_dataTime:Number;
      
      public function AVDictionaryDataEvent(type:String = "avDictionaryData", bubbles:Boolean = false, cancelable:Boolean = false, init_dictionary:Dictionary = null, init_dataTime:Number = 0)
      {
         super(type,bubbles,cancelable);
         this.m_dictionary = init_dictionary;
         this.m_dataTime = init_dataTime;
      }
      
      public function get dictionary() : Dictionary
      {
         return this.m_dictionary;
      }
      
      public function get time() : Number
      {
         return this.m_dataTime;
      }
   }
}

