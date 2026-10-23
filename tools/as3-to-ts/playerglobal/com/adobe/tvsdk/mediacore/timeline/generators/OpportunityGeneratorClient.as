package com.adobe.tvsdk.mediacore.timeline.generators
{
   import com.adobe.tvsdk.mediacore.timeline.Opportunity;
   import com.adobe.tvsdk.mediacore.timeline.Reservation;
   import com.adobe.tvsdk.mediacore.utils.TimeRange;
   
   [native(cls="PSDKOpportunityGeneratorClientClass",instance="PSDKOpportunityGeneratorClientObject",methods="auto",construct="native")]
   [API("712")]
   public class OpportunityGeneratorClient
   {
      
      public function OpportunityGeneratorClient()
      {
         super();
      }
      
      final public native function resolve(param1:Opportunity) : void;
      
      final public native function hold(param1:TimeRange) : Reservation;
      
      final public native function cancel(param1:Reservation) : void;
   }
}

