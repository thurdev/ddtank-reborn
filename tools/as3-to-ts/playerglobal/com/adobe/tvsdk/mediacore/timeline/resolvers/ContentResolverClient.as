package com.adobe.tvsdk.mediacore.timeline.resolvers
{
   import com.adobe.tvsdk.mediacore.notifications.Notification;
   import com.adobe.tvsdk.mediacore.timeline.Opportunity;
   import com.adobe.tvsdk.mediacore.timeline.operations.TimelineOperation;
   
   [native(cls="PSDKContentResolverClientClass",instance="PSDKContentResolverClientObject",methods="auto",construct="native")]
   [API("712")]
   public class ContentResolverClient
   {
      
      public function ContentResolverClient()
      {
         super();
      }
      
      final public native function process(param1:Vector.<TimelineOperation>) : void;
      
      final public native function notifyCompleted(param1:Opportunity) : void;
      
      final public native function notifyFailed(param1:Opportunity, param2:Notification) : void;
   }
}

