package flash.net
{
   import flash.events.*;
   import flash.media.*;
   
   [Version("10.1")]
   public final class NetStreamMulticastInfo
   {
      
      private var m_sendDataBytesPerSecond:Number;
      
      private var m_sendControlBytesPerSecond:Number;
      
      private var m_receiveDataBytesPerSecond:Number;
      
      private var m_receiveControlBytesPerSecond:Number;
      
      private var m_bytesPushedToPeers:Number;
      
      private var m_fragmentsPushedToPeers:Number;
      
      private var m_bytesRequestedByPeers:Number;
      
      private var m_fragmentsRequestedByPeers:Number;
      
      private var m_bytesPushedFromPeers:Number;
      
      private var m_fragmentsPushedFromPeers:Number;
      
      private var m_bytesRequestedFromPeers:Number;
      
      private var m_fragmentsRequestedFromPeers:Number;
      
      private var m_sendControlBytesPerSecondToServer:Number;
      
      private var m_receiveDataBytesPerSecondFromServer:Number;
      
      private var m_bytesReceivedFromServer:Number;
      
      private var m_fragmentsReceivedFromServer:Number;
      
      private var m_receiveDataBytesPerSecondFromIPMulticast:Number;
      
      private var m_bytesReceivedFromIPMulticast:Number;
      
      private var m_fragmentsReceivedFromIPMulticast:Number;
      
      public function NetStreamMulticastInfo(sendDataBytesPerSecond:Number, sendControlBytesPerSecond:Number, receiveDataBytesPerSecond:Number, receiveControlBytesPerSecond:Number, bytesPushedToPeers:Number, fragmentsPushedToPeers:Number, bytesRequestedByPeers:Number, fragmentsRequestedByPeers:Number, bytesPushedFromPeers:Number, fragmentsPushedFromPeers:Number, bytesRequestedFromPeers:Number, fragmentsRequestedFromPeers:Number, sendControlBytesPerSecondToServer:Number, receiveDataBytesPerSecondFromServer:Number, bytesReceivedFromServer:Number, fragmentsReceivedFromServer:Number, receiveDataBytesPerSecondFromIPMulticast:Number, bytesReceivedFromIPMulticast:Number, fragmentsReceivedFromIPMulticast:Number)
      {
         super();
         this.m_sendDataBytesPerSecond = sendDataBytesPerSecond;
         this.m_sendControlBytesPerSecond = sendControlBytesPerSecond;
         this.m_receiveDataBytesPerSecond = receiveDataBytesPerSecond;
         this.m_receiveControlBytesPerSecond = receiveControlBytesPerSecond;
         this.m_bytesPushedToPeers = bytesPushedToPeers;
         this.m_fragmentsPushedToPeers = fragmentsPushedToPeers;
         this.m_bytesRequestedByPeers = bytesRequestedByPeers;
         this.m_fragmentsRequestedByPeers = fragmentsRequestedByPeers;
         this.m_bytesPushedFromPeers = bytesPushedFromPeers;
         this.m_fragmentsPushedFromPeers = fragmentsPushedFromPeers;
         this.m_bytesRequestedFromPeers = bytesRequestedFromPeers;
         this.m_fragmentsRequestedFromPeers = fragmentsRequestedFromPeers;
         this.m_sendControlBytesPerSecondToServer = sendControlBytesPerSecondToServer;
         this.m_receiveDataBytesPerSecondFromServer = receiveDataBytesPerSecondFromServer;
         this.m_bytesReceivedFromServer = bytesReceivedFromServer;
         this.m_fragmentsReceivedFromServer = fragmentsReceivedFromServer;
         this.m_receiveDataBytesPerSecondFromIPMulticast = receiveDataBytesPerSecondFromIPMulticast;
         this.m_bytesReceivedFromIPMulticast = bytesReceivedFromIPMulticast;
         this.m_fragmentsReceivedFromIPMulticast = fragmentsReceivedFromIPMulticast;
      }
      
      public function get sendDataBytesPerSecond() : Number
      {
         return this.m_sendDataBytesPerSecond;
      }
      
      public function get sendControlBytesPerSecond() : Number
      {
         return this.m_sendControlBytesPerSecond;
      }
      
      public function get receiveDataBytesPerSecond() : Number
      {
         return this.m_receiveDataBytesPerSecond;
      }
      
      public function get receiveControlBytesPerSecond() : Number
      {
         return this.m_receiveControlBytesPerSecond;
      }
      
      public function get bytesPushedToPeers() : Number
      {
         return this.m_bytesPushedToPeers;
      }
      
      public function get fragmentsPushedToPeers() : Number
      {
         return this.m_fragmentsPushedToPeers;
      }
      
      public function get bytesRequestedByPeers() : Number
      {
         return this.m_bytesRequestedByPeers;
      }
      
      public function get fragmentsRequestedByPeers() : Number
      {
         return this.m_fragmentsRequestedByPeers;
      }
      
      public function get bytesPushedFromPeers() : Number
      {
         return this.m_bytesPushedFromPeers;
      }
      
      public function get fragmentsPushedFromPeers() : Number
      {
         return this.m_fragmentsPushedFromPeers;
      }
      
      public function get bytesRequestedFromPeers() : Number
      {
         return this.m_bytesRequestedFromPeers;
      }
      
      public function get fragmentsRequestedFromPeers() : Number
      {
         return this.m_fragmentsRequestedFromPeers;
      }
      
      public function get sendControlBytesPerSecondToServer() : Number
      {
         return this.m_sendControlBytesPerSecondToServer;
      }
      
      public function get receiveDataBytesPerSecondFromServer() : Number
      {
         return this.m_receiveDataBytesPerSecondFromServer;
      }
      
      public function get bytesReceivedFromServer() : Number
      {
         return this.m_bytesReceivedFromServer;
      }
      
      public function get fragmentsReceivedFromServer() : Number
      {
         return this.m_fragmentsReceivedFromServer;
      }
      
      public function get receiveDataBytesPerSecondFromIPMulticast() : Number
      {
         return this.m_receiveDataBytesPerSecondFromIPMulticast;
      }
      
      public function get bytesReceivedFromIPMulticast() : Number
      {
         return this.m_bytesReceivedFromIPMulticast;
      }
      
      public function get fragmentsReceivedFromIPMulticast() : Number
      {
         return this.m_fragmentsReceivedFromIPMulticast;
      }
      
      public function toString() : String
      {
         return "sendDataBytesPerSecond=" + this.m_sendDataBytesPerSecond + " sendControlBytesPerSecond=" + this.m_sendControlBytesPerSecond + " receiveDataBytesPerSecond=" + this.m_receiveDataBytesPerSecond + " receiveControlBytesPerSecond=" + this.m_receiveControlBytesPerSecond + " bytesPushedToPeers=" + this.m_bytesPushedToPeers + " fragmentsPushedToPeers=" + this.m_fragmentsPushedToPeers + " bytesRequestedByPeers=" + this.m_bytesRequestedByPeers + " fragmentsRequestedByPeers=" + this.m_fragmentsRequestedByPeers + " bytesPushedFromPeers=" + this.m_bytesPushedFromPeers + " fragmentsPushedFromPeers=" + this.m_fragmentsPushedFromPeers + " bytesRequestedFromPeers=" + this.m_bytesRequestedFromPeers + " fragmentsRequestedFromPeers=" + this.m_fragmentsRequestedFromPeers + " sendControlBytesPerSecondToServer=" + this.m_sendControlBytesPerSecondToServer + " receiveDataBytesPerSecondFromServer=" + this.m_receiveDataBytesPerSecondFromServer + " bytesReceivedFromServer=" + this.m_bytesReceivedFromServer + " fragmentsReceivedFromServer=" + this
         .m_fragmentsReceivedFromServer + " receiveDataBytesPerSecondFromIPMulticast=" + this.m_receiveDataBytesPerSecondFromIPMulticast + " bytesReceivedFromIPMulticast=" + this.m_bytesReceivedFromIPMulticast + " fragmentsReceivedFromIPMulticast=" + this.m_fragmentsReceivedFromIPMulticast;
      }
   }
}

