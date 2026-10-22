package flash.security
{
   [native(cls="X500DistinguishedNameClass",instance="X500DistinguishedNameObject",methods="auto")]
   [API("674")]
   public class X500DistinguishedName
   {
      
      public function X500DistinguishedName()
      {
         super();
      }
      
      public native function get commonName() : String;
      
      public native function get organizationName() : String;
      
      public native function get organizationalUnitName() : String;
      
      public native function get localityName() : String;
      
      public native function get stateOrProvinceName() : String;
      
      public native function get countryName() : String;
      
      public native function toString() : String;
   }
}

