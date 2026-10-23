package flash.automation
{
   [ExcludeClass]
   [native(cls="ConfigurationClass",methods="auto",construct="none")]
   public class Configuration
   {
      
      public function Configuration()
      {
         super();
      }
      
      public static native function get testAutomationConfiguration() : String;
      
      public static native function set deviceConfiguration(param1:String) : void;
      
      public static native function get deviceConfiguration() : String;
   }
}

