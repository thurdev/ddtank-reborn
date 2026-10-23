package flash.text
{
   [native(cls="CSMSettingsClass",instance="CSMSettingsObject",methods="auto")]
   public final class CSMSettings
   {
      
      public var fontSize:Number;
      
      public var insideCutoff:Number;
      
      public var outsideCutoff:Number;
      
      public function CSMSettings(fontSize:Number, insideCutoff:Number, outsideCutoff:Number)
      {
         super();
         this.fontSize = fontSize;
         this.insideCutoff = insideCutoff;
         this.outsideCutoff = outsideCutoff;
      }
   }
}

