package flash.system
{
   [native(cls="SecurityClass",gc="exact",methods="auto",construct="none")]
   public final class Security
   {
      
      public static const REMOTE:String = "remote";
      
      public static const LOCAL_WITH_FILE:String = "localWithFile";
      
      public static const LOCAL_WITH_NETWORK:String = "localWithNetwork";
      
      public static const LOCAL_TRUSTED:String = "localTrusted";
      
      [API("661")]
      public static const APPLICATION:String = "application";
      
      public function Security()
      {
         super();
      }
      
      public static native function allowDomain(... rest) : void;
      
      public static native function allowInsecureDomain(... rest) : void;
      
      public static native function loadPolicyFile(param1:String) : void;
      
      public static native function get exactSettings() : Boolean;
      
      public static native function set exactSettings(param1:Boolean) : void;
      
      [Inspectable(environment="none")]
      public static native function get disableAVM1Loading() : Boolean;
      
      public static native function set disableAVM1Loading(param1:Boolean) : void;
      
      internal static native function duplicateSandboxBridgeInputArguments(param1:Object, param2:Array) : Array;
      
      internal static native function duplicateSandboxBridgeOutputArgument(param1:Object, param2:*) : *;
      
      [cppcall]
      private static function createSandboxBridgeProxyFunction(targetFunc:Object, targetObj:Object, srcToplevel:Object, destToplevel:Object) : Object
      {
         return function(... rawArgs):*
         {
            var args:* = duplicateSandboxBridgeInputArguments(srcToplevel,rawArgs);
            var res:* = targetFunc.apply(targetObj,args);
            return duplicateSandboxBridgeOutputArgument(destToplevel,res);
         };
      }
      
      public static native function showSettings(param1:String = "default") : void;
      
      public static native function get sandboxType() : String;
      
      [API("672")]
      public static native function get pageDomain() : String;
   }
}

