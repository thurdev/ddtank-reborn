package flash.sampler
{
   [native(cls="NewObjectSampleClass",instance="NewObjectSampleObject",methods="auto")]
   public final class NewObjectSample extends Sample
   {
      
      public const id:Number;
      
      public const type:Class;
      
      public function NewObjectSample()
      {
         super();
      }
      
      public native function get object() : *;
      
      public native function get size() : Number;
   }
}

