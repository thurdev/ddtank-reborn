package
{
   [native(cls="ClassClass",gc="exact",instance="ClassClosure",methods="auto",construct="instance")]
   public dynamic class Class
   {
      
      public static const length:int = 1;
      
      public function Class()
      {
         super();
      }
      
      final public native function get prototype() : *;
   }
}

