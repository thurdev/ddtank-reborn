package flash.net
{
   import flash.events.*;
   import flash.media.*;
   
   [Version("10.1")]
   public final class NetGroupInfo
   {
      
      private var m_postingSendDataBytesPerSecond:Number;
      
      private var m_postingSendControlBytesPerSecond:Number;
      
      private var m_postingReceiveDataBytesPerSecond:Number;
      
      private var m_postingReceiveControlBytesPerSecond:Number;
      
      private var m_routingSendBytesPerSecond:Number;
      
      private var m_routingReceiveBytesPerSecond:Number;
      
      private var m_objectReplicationSendBytesPerSecond:Number;
      
      private var m_objectReplicationReceiveBytesPerSecond:Number;
      
      public function NetGroupInfo(postingSendDataBytesPerSecond:Number, postingSendControlBytesPerSecond:Number, postingReceiveDataBytesPerSecond:Number, postingReceiveControlBytesPerSecond:Number, routingSendBytesPerSecond:Number, routingReceiveBytesPerSecond:Number, objectReplicationSendBytesPerSecond:Number, objectReplicationReceiveBytesPerSecond:Number)
      {
         super();
         this.m_postingSendDataBytesPerSecond = postingSendDataBytesPerSecond;
         this.m_postingSendControlBytesPerSecond = postingSendControlBytesPerSecond;
         this.m_postingReceiveDataBytesPerSecond = postingReceiveDataBytesPerSecond;
         this.m_postingReceiveControlBytesPerSecond = postingReceiveControlBytesPerSecond;
         this.m_routingSendBytesPerSecond = routingSendBytesPerSecond;
         this.m_routingReceiveBytesPerSecond = routingReceiveBytesPerSecond;
         this.m_objectReplicationSendBytesPerSecond = objectReplicationSendBytesPerSecond;
         this.m_objectReplicationReceiveBytesPerSecond = objectReplicationReceiveBytesPerSecond;
      }
      
      public function get postingSendDataBytesPerSecond() : Number
      {
         return this.m_postingSendDataBytesPerSecond;
      }
      
      public function get postingSendControlBytesPerSecond() : Number
      {
         return this.m_postingSendControlBytesPerSecond;
      }
      
      public function get postingReceiveDataBytesPerSecond() : Number
      {
         return this.m_postingReceiveDataBytesPerSecond;
      }
      
      public function get postingReceiveControlBytesPerSecond() : Number
      {
         return this.m_postingReceiveControlBytesPerSecond;
      }
      
      public function get routingSendBytesPerSecond() : Number
      {
         return this.m_routingSendBytesPerSecond;
      }
      
      public function get routingReceiveBytesPerSecond() : Number
      {
         return this.m_routingReceiveBytesPerSecond;
      }
      
      public function get objectReplicationSendBytesPerSecond() : Number
      {
         return this.m_objectReplicationSendBytesPerSecond;
      }
      
      public function get objectReplicationReceiveBytesPerSecond() : Number
      {
         return this.m_objectReplicationReceiveBytesPerSecond;
      }
      
      public function toString() : String
      {
         return "postingSendDataBytesPerSecond=" + this.m_postingSendDataBytesPerSecond + " postingSendControlBytesPerSecond=" + this.m_postingSendControlBytesPerSecond + " postingReceiveDataBytesPerSecond=" + this.m_postingReceiveDataBytesPerSecond + " postingReceiveControlBytesPerSecond=" + this.m_postingReceiveControlBytesPerSecond + " routingSendBytesPerSecond=" + this.m_routingSendBytesPerSecond + " routingReceiveBytesPerSecond=" + this.m_routingReceiveBytesPerSecond + " objectReplicationSendBytesPerSecond=" + this.m_objectReplicationSendBytesPerSecond + " objectReplicationReceiveBytesPerSecond=" + this.m_objectReplicationReceiveBytesPerSecond;
      }
   }
}

