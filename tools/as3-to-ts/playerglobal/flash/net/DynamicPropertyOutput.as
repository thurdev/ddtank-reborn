package flash.net
{
   [native(cls="DynamicPropertyOutputClass",gc="exact",instance="DynamicPropertyOutputObject",methods="auto",construct="native")]
   internal class DynamicPropertyOutput implements IDynamicPropertyOutput
   {
      
      public function DynamicPropertyOutput()
      {
         super();
      }
      
      public native function writeDynamicProperty(param1:String, param2:*) : void;
   }
}

