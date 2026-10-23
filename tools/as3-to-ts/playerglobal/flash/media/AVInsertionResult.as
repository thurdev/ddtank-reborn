package flash.media
{
   [API("688")]
   public class AVInsertionResult extends AVResult
   {
      
      private var m_periodIndex:int;
      
      private var m_insertedBeforeReadHead:Boolean;
      
      public function AVInsertionResult(result:int, periodIndex:int, insertedBeforeReadHead:Boolean)
      {
         super(result);
         this.m_insertedBeforeReadHead = insertedBeforeReadHead;
         this.m_periodIndex = periodIndex;
      }
      
      public function get periodIndex() : int
      {
         return this.m_periodIndex;
      }
      
      public function get insertedBeforeReadHead() : Boolean
      {
         return this.m_insertedBeforeReadHead;
      }
   }
}

