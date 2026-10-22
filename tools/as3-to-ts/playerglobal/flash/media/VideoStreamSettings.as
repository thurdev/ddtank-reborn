package flash.media
{
   [API("674")]
   public class VideoStreamSettings
   {
      
      private var m_height:int;
      
      private var m_width:int;
      
      private var m_fps:Number;
      
      private var m_bandwidth:int;
      
      private var m_quality:int;
      
      private var m_keyFrameInterval:int;
      
      public function VideoStreamSettings()
      {
         super();
         this.m_height = -1;
         this.m_width = -1;
         this.m_fps = -1;
         this.m_bandwidth = -1;
         this.m_quality = -1;
         this.m_keyFrameInterval = -1;
      }
      
      [cppcall]
      public function setMode(width:int, height:int, fps:Number) : void
      {
         if(width < 1 && width != -1)
         {
            width = 1;
         }
         if(height < 1 && height != -1)
         {
            height = 1;
         }
         if(isNaN(fps))
         {
            fps = 0;
         }
         if(fps < 0 && fps != -1)
         {
            fps = 0;
         }
         if(width > 1920)
         {
            width = 1920;
         }
         if(height > 1920)
         {
            height = 1920;
         }
         if(fps > 60)
         {
            fps = 60;
         }
         this.m_width = width;
         this.m_height = height;
         this.m_fps = fps;
      }
      
      public function get width() : int
      {
         return this.m_width;
      }
      
      public function get height() : int
      {
         return this.m_height;
      }
      
      public function get fps() : Number
      {
         return this.m_fps;
      }
      
      [cppcall]
      public function setQuality(bandwidth:int, quality:int) : void
      {
         if(bandwidth < 0 && bandwidth != -1)
         {
            bandwidth = 0;
         }
         if(quality < 0 && quality != -1)
         {
            quality = 0;
         }
         if(quality > 100)
         {
            quality = 100;
         }
         this.m_bandwidth = bandwidth;
         this.m_quality = quality;
      }
      
      public function get quality() : int
      {
         return this.m_quality;
      }
      
      public function get bandwidth() : int
      {
         return this.m_bandwidth;
      }
      
      [cppcall]
      public function setKeyFrameInterval(keyFrameInterval:int) : void
      {
         if(keyFrameInterval < 1 && keyFrameInterval != -1)
         {
            keyFrameInterval = 1;
         }
         if(keyFrameInterval > 300)
         {
            keyFrameInterval = 300;
         }
         this.m_keyFrameInterval = keyFrameInterval;
      }
      
      public function get keyFrameInterval() : int
      {
         return this.m_keyFrameInterval;
      }
      
      public function get codec() : String
      {
         return VideoCodec.SORENSON;
      }
   }
}

