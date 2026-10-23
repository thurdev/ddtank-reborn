package flash.display
{
   [native(cls="PNGEncoderOptionsClass",instance="PNGEncoderOptionsObject",methods="auto")]
   [API("680")]
   public final class PNGEncoderOptions
   {
      
      public var fastCompression:Boolean;
      
      public function PNGEncoderOptions(fastCompression:Boolean = false)
      {
         super();
         this.fastCompression = fastCompression;
      }
   }
}

