package com.adobe.tvsdk.mediacore.system
{
   import com.adobe.tvsdk.mediacore.*;
   import com.adobe.tvsdk.mediacore.info.*;
   import com.adobe.tvsdk.mediacore.metadata.*;
   import com.adobe.tvsdk.mediacore.notifications.*;
   import com.adobe.tvsdk.mediacore.qos.*;
   import com.adobe.tvsdk.mediacore.qos.metrics.*;
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
   
   [native(cls="PSDKNetworkConfigurationClass",instance="PSDKNetworkConfigurationObject",methods="auto")]
   [API("712")]
   public class NetworkConfiguration
   {
      
      public function NetworkConfiguration()
      {
         super();
         this.ctor();
      }
      
      private native function ctor() : void;
      
      final public native function addCustomHeader(param1:String, param2:Vector.<String>) : void;
      
      final public native function get forceNativeNetworking() : Boolean;
      
      final public native function set forceNativeNetworking(param1:Boolean) : void;
      
      final public native function get useRedirectedUrl() : Boolean;
      
      final public native function set useRedirectedUrl(param1:Boolean) : void;
      
      final public native function get cookieHeaders() : Metadata;
      
      final public native function set cookieHeaders(param1:Metadata) : void;
      
      final public native function get readSetCookieHeader() : Boolean;
      
      final public native function set readSetCookieHeader(param1:Boolean) : void;
      
      final public native function get masterUpdateInterval() : int;
      
      final public native function set masterUpdateInterval(param1:int) : void;
      
      final public native function get useCookieHeaderForAllRequests() : Boolean;
      
      final public native function set useCookieHeaderForAllRequests(param1:Boolean) : void;
      
      final public native function get readLimit() : int;
      
      final public native function set readLimit(param1:int) : void;
      
      final public native function get numFragmentsToTryBeforeError() : int;
      
      final public native function set numFragmentsToTryBeforeError(param1:int) : void;
      
      final public native function get keepAlive() : Boolean;
      
      final public native function set keepAlive(param1:Boolean) : void;
      
      final public native function get networkDownVerificationUrl() : String;
      
      final public native function set networkDownVerificationUrl(param1:String) : void;
      
      final public native function get useParentManifestQueryParameters() : Boolean;
      
      final public native function set useParentManifestQueryParameters(param1:Boolean) : void;
      
      final public native function get appendRandomQueryParameter() : String;
      
      final public native function set appendRandomQueryParameter(param1:String) : void;
   }
}

