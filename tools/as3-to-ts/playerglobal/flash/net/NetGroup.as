package flash.net
{
   import flash.events.*;
   import flash.media.*;
   
   [native(cls="NetGroupClass",instance="NetGroupObject",methods="auto")]
   [Version("10.1")]
   [Event(name="netStatus",type="flash.events.NetStatusEvent")]
   public class NetGroup extends EventDispatcher
   {
      
      private static const kClose:uint = 0;
      
      private static const kPost:uint = 344;
      
      private static const kSendToNearest:uint = 345;
      
      private static const kSendToNeighbor:uint = 346;
      
      private static const kGetReceiveMode:uint = 347;
      
      private static const kSetReceiveMode:uint = 348;
      
      private static const kGetEstimatedMemberCount:uint = 349;
      
      private static const kGetNeighborCount:uint = 350;
      
      private static const kGetLocalCoverageFrom:uint = 353;
      
      private static const kGetLocalCoverageTo:uint = 354;
      
      private static const kGetReplicationStrategy:uint = 355;
      
      private static const kSetReplicationStrategy:uint = 356;
      
      private static const kUpdateHaveBlocks:uint = 357;
      
      private static const kUpdateWantBlocks:uint = 358;
      
      private static const kWriteRequestedBlock:uint = 359;
      
      private static const kDenyRequestedBlock:uint = 360;
      
      private static const kAddNeighbor:uint = 361;
      
      private static const kAddMemberHint:uint = 362;
      
      public function NetGroup(connection:NetConnection, groupspec:String)
      {
         super();
         this.ctor(connection,groupspec);
      }
      
      private native function ctor(param1:NetConnection, param2:String) : void;
      
      private function onStatus(info:*) : void
      {
         dispatchEvent(new NetStatusEvent("status",false,false,info));
      }
      
      public function close() : void
      {
         this.invoke(kClose);
      }
      
      private native function invoke(param1:uint, ... rest) : *;
      
      public function get replicationStrategy() : String
      {
         return this.invoke(kGetReplicationStrategy);
      }
      
      public function set replicationStrategy(s:String) : void
      {
         this.invoke(kSetReplicationStrategy,s);
      }
      
      public function addHaveObjects(startIndex:Number, endIndex:Number) : void
      {
         if(startIndex < 0 || startIndex > 9007199254740992 || endIndex < 0 || endIndex > 9007199254740992)
         {
            Error.throwError(RangeError,2006);
         }
         else
         {
            this.invoke(kUpdateHaveBlocks,true,startIndex,endIndex);
         }
      }
      
      public function removeHaveObjects(startIndex:Number, endIndex:Number) : void
      {
         if(startIndex < 0 || startIndex > 9007199254740992 || endIndex < 0 || endIndex > 9007199254740992)
         {
            Error.throwError(RangeError,2006);
         }
         else
         {
            this.invoke(kUpdateHaveBlocks,false,startIndex,endIndex);
         }
      }
      
      public function addWantObjects(startIndex:Number, endIndex:Number) : void
      {
         if(startIndex < 0 || startIndex > 9007199254740992 || endIndex < 0 || endIndex > 9007199254740992)
         {
            Error.throwError(RangeError,2006);
         }
         else
         {
            this.invoke(kUpdateWantBlocks,true,startIndex,endIndex);
         }
      }
      
      public function removeWantObjects(startIndex:Number, endIndex:Number) : void
      {
         if(startIndex < 0 || startIndex > 9007199254740992 || endIndex < 0 || endIndex > 9007199254740992)
         {
            Error.throwError(RangeError,2006);
         }
         else
         {
            this.invoke(kUpdateWantBlocks,false,startIndex,endIndex);
         }
      }
      
      public function writeRequestedObject(requestID:int, object:Object) : void
      {
         this.invoke(kWriteRequestedBlock,requestID,object);
      }
      
      public function denyRequestedObject(requestID:int) : void
      {
         this.invoke(kDenyRequestedBlock,requestID);
      }
      
      public function get estimatedMemberCount() : Number
      {
         return this.invoke(kGetEstimatedMemberCount);
      }
      
      public function get neighborCount() : Number
      {
         return this.invoke(kGetNeighborCount);
      }
      
      public function get receiveMode() : String
      {
         return this.invoke(kGetReceiveMode);
      }
      
      public function set receiveMode(mode:String) : *
      {
         return this.invoke(kSetReceiveMode,mode);
      }
      
      public native function get info() : NetGroupInfo;
      
      public native function convertPeerIDToGroupAddress(param1:String) : String;
      
      public native function get localCoverageFrom() : String;
      
      public native function get localCoverageTo() : String;
      
      public function post(message:Object) : String
      {
         return this.invoke(kPost,message);
      }
      
      public function sendToNearest(message:Object, groupAddress:String) : String
      {
         return this.invoke(kSendToNearest,message,groupAddress,null,null);
      }
      
      public function sendToNeighbor(message:Object, sendMode:String) : String
      {
         return this.invoke(kSendToNeighbor,message,sendMode);
      }
      
      public function sendToAllNeighbors(message:Object) : String
      {
         return this.invoke(kSendToNeighbor,message,"allNeighbors");
      }
      
      public function addNeighbor(peerID:String) : Boolean
      {
         return this.invoke(kAddNeighbor,peerID);
      }
      
      public function addMemberHint(peerID:String) : Boolean
      {
         return this.invoke(kAddMemberHint,peerID);
      }
   }
}

