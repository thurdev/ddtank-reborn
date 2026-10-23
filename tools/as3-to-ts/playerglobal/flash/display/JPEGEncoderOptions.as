package flash.display
{
   [native(cls="JPEGEncoderOptionsClass",instance="JPEGEncoderOptionsObject",methods="auto")]
   [API("680")]
   public final class JPEGEncoderOptions
   {
      
      public var quality:uint;
      
      public function JPEGEncoderOptions(quality:uint = 80)
      {
         super();
         this.quality = quality;
      }
   }
}

