package flash.system
{
   import flash.display.DisplayObjectContainer;
   
   public class LoaderContext
   {
      
      public var checkPolicyFile:Boolean = false;
      
      public var applicationDomain:ApplicationDomain = null;
      
      public var securityDomain:SecurityDomain = null;
      
      public var allowCodeImport:Boolean;
      
      [API("670")]
      public var requestedContentParent:DisplayObjectContainer;
      
      [API("670")]
      public var parameters:Object;
      
      [API("674")]
      public var imageDecodingPolicy:String;
      
      public function LoaderContext(checkPolicyFile:Boolean = false, applicationDomain:ApplicationDomain = null, securityDomain:SecurityDomain = null)
      {
         super();
         this.checkPolicyFile = checkPolicyFile;
         this.applicationDomain = applicationDomain;
         this.securityDomain = securityDomain;
         this.requestedContentParent = null;
         this.parameters = null;
         this.imageDecodingPolicy = ImageDecodingPolicy.ON_DEMAND;
         if(Security.sandboxType == Security.APPLICATION)
         {
            this.allowCodeImport = false;
         }
         else
         {
            this.allowCodeImport = true;
         }
      }
      
      [API("661")]
      public function get allowLoadBytesCodeExecution() : Boolean
      {
         return this.allowCodeImport;
      }
      
      [API("661")]
      public function set allowLoadBytesCodeExecution(allow:Boolean) : void
      {
         this.allowCodeImport = allow;
      }
   }
}

