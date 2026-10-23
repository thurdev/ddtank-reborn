package flash.system
{
   import flash.events.EventDispatcher;
   import flash.utils.ByteArray;
   
   [API("686")]
   [native(cls="ApplicationInstallerClass",gc="exact",instance="ApplicationInstallerObject",methods="auto",construct="native")]
   [ExcludeClass]
   public final class ApplicationInstaller extends EventDispatcher
   {
      
      private var _strings:XML;
      
      private var _icon:ByteArray;
      
      public function ApplicationInstaller()
      {
         super();
      }
      
      public static native function stringsDigest(param1:XML) : String;
      
      public static native function iconDigest(param1:ByteArray) : String;
      
      public native function install(param1:String = "install_with_shortcuts") : void;
      
      public native function get isInstalled() : Boolean;
   }
}

