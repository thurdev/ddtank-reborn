package flash.system
{
   [native(cls="SecurityDomainClass",gc="exact",instance="SecurityDomainObject",methods="auto")]
   public class SecurityDomain
   {
      
      public function SecurityDomain()
      {
         super();
         this.ctor_impl();
      }
      
      public static native function get currentDomain() : SecurityDomain;
      
      private native function ctor_impl() : void;
      
      [API("680")]
      public native function get domainID() : String;
   }
}

