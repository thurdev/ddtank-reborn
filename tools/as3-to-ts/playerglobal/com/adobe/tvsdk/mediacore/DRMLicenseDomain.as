package com.adobe.tvsdk.mediacore
{
   [native(cls="PSDKDRMLicenseDomainClass",instance="PSDKDRMLicenseDomainObject",methods="auto")]
   [API("712")]
   public class DRMLicenseDomain
   {
      
      public function DRMLicenseDomain()
      {
         super();
      }
      
      final public native function get authenticationDomain() : String;
      
      final public native function get authenticationMethod() : int;
      
      final public native function get serverUrl() : String;
      
      final public native function get name() : String;
      
      final public native function set name(param1:String) : void;
   }
}

