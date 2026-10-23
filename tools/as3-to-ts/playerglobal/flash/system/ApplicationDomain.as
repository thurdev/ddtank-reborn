package flash.system
{
   import flash.utils.ByteArray;
   
   [native(cls="ApplicationDomainClass",gc="exact",instance="ApplicationDomainObject",methods="auto")]
   public final class ApplicationDomain
   {
      
      public function ApplicationDomain(parentDomain:ApplicationDomain = null)
      {
         super();
         this.ctor(parentDomain);
      }
      
      public static native function get currentDomain() : ApplicationDomain;
      
      [API("663")]
      public static native function get MIN_DOMAIN_MEMORY_LENGTH() : uint;
      
      private native function ctor(param1:ApplicationDomain) : void;
      
      public native function get parentDomain() : ApplicationDomain;
      
      public native function getDefinition(param1:String) : Object;
      
      public native function hasDefinition(param1:String) : Boolean;
      
      public native function getQualifiedDefinitionNames() : Vector.<String>;
      
      [API("663")]
      public native function get domainMemory() : ByteArray;
      
      [API("663")]
      public native function set domainMemory(param1:ByteArray) : *;
   }
}

