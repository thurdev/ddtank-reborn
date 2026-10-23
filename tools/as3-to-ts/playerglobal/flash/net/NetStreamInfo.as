package flash.net
{
   [Version("10")]
   public final class NetStreamInfo
   {
      
      private var m_currentBytesPerSecond:Number;
      
      private var m_byteCount:Number;
      
      private var m_maxBytesPerSecond:Number;
      
      private var m_audioBytesPerSecond:Number;
      
      private var m_audioByteCount:Number;
      
      private var m_videoBytesPerSecond:Number;
      
      private var m_videoByteCount:Number;
      
      private var m_dataBytesPerSecond:Number;
      
      private var m_dataByteCount:Number;
      
      private var m_playbackBytesPerSecond:Number;
      
      private var m_droppedFrames:Number;
      
      private var m_audioBufferByteLength:Number;
      
      private var m_videoBufferByteLength:Number;
      
      private var m_dataBufferByteLength:Number;
      
      private var m_audioBufferLength:Number;
      
      private var m_videoBufferLength:Number;
      
      private var m_dataBufferLength:Number;
      
      private var m_srtt:Number;
      
      private var m_audioLossRate:Number;
      
      private var m_videoLossRate:Number;
      
      private var m_metaData:Object;
      
      private var m_xmpData:Object;
      
      private var m_resourceName:String;
      
      private var m_uri:String;
      
      private var m_isLive:Boolean;
      
      public function NetStreamInfo(curBPS:Number, byteCount:Number, maxBPS:Number, audioBPS:Number, audioByteCount:Number, videoBPS:Number, videoByteCount:Number, dataBPS:Number, dataByteCount:Number, playbackBPS:Number, droppedFrames:Number, audioBufferByteLength:Number, videoBufferByteLength:Number, dataBufferByteLength:Number, audioBufferLength:Number, videoBufferLength:Number, dataBufferLength:Number, srtt:Number, audioLossRate:Number, videoLossRate:Number, metaData:Object = null, xmpData:Object = null, uri:String = null, resourceName:String = null, isLive:Boolean = true)
      {
         super();
         this.m_currentBytesPerSecond = curBPS;
         this.m_byteCount = byteCount;
         this.m_maxBytesPerSecond = maxBPS;
         this.m_audioBytesPerSecond = audioBPS;
         this.m_audioByteCount = audioByteCount;
         this.m_videoBytesPerSecond = videoBPS;
         this.m_videoByteCount = videoByteCount;
         this.m_dataBytesPerSecond = dataBPS;
         this.m_dataByteCount = dataByteCount;
         this.m_playbackBytesPerSecond = playbackBPS;
         this.m_droppedFrames = droppedFrames;
         this.m_audioBufferByteLength = audioBufferByteLength;
         this.m_videoBufferByteLength = videoBufferByteLength;
         this.m_dataBufferByteLength = dataBufferByteLength;
         this.m_audioBufferLength = audioBufferLength;
         this.m_videoBufferLength = videoBufferLength;
         this.m_dataBufferLength = dataBufferLength;
         this.m_srtt = srtt;
         this.m_audioLossRate = audioLossRate;
         this.m_videoLossRate = videoLossRate;
         this.m_metaData = metaData;
         this.m_xmpData = xmpData;
         this.m_uri = uri;
         this.m_resourceName = resourceName;
         this.m_isLive = isLive;
      }
      
      public function get currentBytesPerSecond() : Number
      {
         return this.m_currentBytesPerSecond;
      }
      
      public function get byteCount() : Number
      {
         return this.m_byteCount;
      }
      
      public function get maxBytesPerSecond() : Number
      {
         return this.m_maxBytesPerSecond;
      }
      
      public function get audioBytesPerSecond() : Number
      {
         return this.m_audioBytesPerSecond;
      }
      
      public function get audioByteCount() : Number
      {
         return this.m_audioByteCount;
      }
      
      public function get videoBytesPerSecond() : Number
      {
         return this.m_videoBytesPerSecond;
      }
      
      public function get videoByteCount() : Number
      {
         return this.m_videoByteCount;
      }
      
      public function get dataBytesPerSecond() : Number
      {
         return this.m_dataBytesPerSecond;
      }
      
      public function get dataByteCount() : Number
      {
         return this.m_dataByteCount;
      }
      
      public function get playbackBytesPerSecond() : Number
      {
         return this.m_playbackBytesPerSecond;
      }
      
      public function get droppedFrames() : Number
      {
         return this.m_droppedFrames;
      }
      
      public function get audioBufferByteLength() : Number
      {
         return this.m_audioBufferByteLength;
      }
      
      public function get videoBufferByteLength() : Number
      {
         return this.m_videoBufferByteLength;
      }
      
      public function get dataBufferByteLength() : Number
      {
         return this.m_dataBufferByteLength;
      }
      
      public function get audioBufferLength() : Number
      {
         return this.m_audioBufferLength;
      }
      
      public function get videoBufferLength() : Number
      {
         return this.m_videoBufferLength;
      }
      
      public function get dataBufferLength() : Number
      {
         return this.m_dataBufferLength;
      }
      
      public function get SRTT() : Number
      {
         return this.m_srtt;
      }
      
      public function get audioLossRate() : Number
      {
         return this.m_audioLossRate;
      }
      
      public function get videoLossRate() : Number
      {
         return this.m_videoLossRate;
      }
      
      [API("672")]
      public function get metaData() : Object
      {
         return this.m_metaData;
      }
      
      [API("672")]
      public function get xmpData() : Object
      {
         return this.m_xmpData;
      }
      
      [API("672")]
      public function get uri() : String
      {
         return this.m_uri;
      }
      
      [API("672")]
      public function get resourceName() : String
      {
         return this.m_resourceName;
      }
      
      [API("672")]
      public function get isLive() : Boolean
      {
         return this.m_isLive;
      }
      
      public function toString() : String
      {
         return "currentBytesPerSecond=" + this.m_currentBytesPerSecond + " byteCount=" + this.m_byteCount + " maxBytesPerSecond=" + this.m_maxBytesPerSecond + " audioBytesPerSecond=" + this.m_audioBytesPerSecond + " audioByteCount=" + this.m_audioByteCount + " videoBytesPerSecond=" + this.m_videoBytesPerSecond + " videoByteCount=" + this.m_videoByteCount + " dataBytesPerSecond=" + this.m_dataBytesPerSecond + " dataByteCount=" + this.m_dataByteCount + " playbackBytesPerSecond=" + this.m_playbackBytesPerSecond + " droppedFrames=" + this.m_droppedFrames + " audioBufferLength=" + this.m_audioBufferLength + " videoBufferLength=" + this.m_videoBufferLength + " dataBufferLength=" + this.m_dataBufferLength + " audioBufferByteLength=" + this.m_audioBufferByteLength + " videoBufferByteLength=" + this.m_videoBufferByteLength + " dataBufferByteLength=" + this.m_dataBufferByteLength + " srtt=" + this.m_srtt + " audioLossRate=" + this.m_audioLossRate + " videoLossRate=" + this.m_videoLossRate + " metaData=" + this
         .m_metaData + " xmpData=" + this.m_xmpData + " uri=" + this.m_uri + " resourceName=" + this.m_resourceName + " isLive=" + this.m_isLive;
      }
   }
}

