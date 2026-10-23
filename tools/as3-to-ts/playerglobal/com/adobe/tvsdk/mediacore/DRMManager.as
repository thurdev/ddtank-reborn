package com.adobe.tvsdk.mediacore
{
   import com.adobe.tvsdk.mediacore.info.*;
   import com.adobe.tvsdk.mediacore.metadata.*;
   import com.adobe.tvsdk.mediacore.notifications.*;
   import com.adobe.tvsdk.mediacore.qos.*;
   import com.adobe.tvsdk.mediacore.qos.metrics.*;
   import com.adobe.tvsdk.mediacore.system.*;
   import com.adobe.tvsdk.mediacore.systems.decoders.*;
   import com.adobe.tvsdk.mediacore.timeline.*;
   import com.adobe.tvsdk.mediacore.timeline.advertising.*;
   import com.adobe.tvsdk.mediacore.timeline.advertising.policy.*;
   import com.adobe.tvsdk.mediacore.timeline.generators.*;
   import com.adobe.tvsdk.mediacore.timeline.operations.*;
   import com.adobe.tvsdk.mediacore.timeline.resolvers.*;
   import com.adobe.tvsdk.mediacore.utils.*;
   import com.adobe.tvsdk.mediacore.view.*;
   import flash.display.*;
   import flash.events.*;
   import flash.media.*;
   import flash.utils.ByteArray;
   
   [native(cls="PSDKDRMManagerClass",instance="PSDKDRMManagerObject",methods="auto",construct="native")]
   [API("712")]
   public class DRMManager extends PSDKEventTargetInterface
   {
      
      public function DRMManager()
      {
         super();
      }
      
      public function addEventListener(t:int, l:Function) : Object
      {
         return eventDispatcher.addEventListener(t,l);
      }
      
      public function removeEventListener(t:int, l:Function) : void
      {
         eventDispatcher.removeEventListener(t,l);
      }
      
      public function dispatchEvent(e:PSDKEvent) : void
      {
         eventDispatcher.dispatchEvent(e);
      }
      
      final public native function acquireLicense(param1:DRMMetadata, param2:int, param3:DRMAcquireLicenseListener) : void;
      
      final public native function acquirePreviewLicense(param1:DRMMetadata, param2:DRMAcquireLicenseListener) : void;
      
      final public native function authenticate(param1:DRMMetadata, param2:String, param3:String, param4:String, param5:String, param6:DRMAuthenticateListener) : void;
      
      final public native function createMetadataFromBytes(param1:ByteArray, param2:DRMErrorListener) : DRMMetadata;
      
      final public native function initialize(param1:DRMOperationCompleteListener) : void;
      
      final public native function joinLicenseDomain(param1:DRMLicenseDomain, param2:Boolean, param3:DRMOperationCompleteListener) : void;
      
      final public native function leaveLicenseDomain(param1:DRMLicenseDomain, param2:DRMOperationCompleteListener) : void;
      
      final public native function resetDRM(param1:DRMOperationCompleteListener) : void;
      
      final public native function returnLicense(param1:String, param2:String, param3:String, param4:Boolean, param5:DRMReturnLicenseListener) : void;
      
      final public native function setAuthenticationToken(param1:DRMMetadata, param2:String, param3:ByteArray, param4:DRMOperationCompleteListener) : void;
      
      final public native function storeLicenseBytes(param1:ByteArray, param2:DRMOperationCompleteListener) : void;
      
      final public native function get maxOperationTime() : int;
      
      final public native function set maxOperationTime(param1:int) : void;
   }
}

