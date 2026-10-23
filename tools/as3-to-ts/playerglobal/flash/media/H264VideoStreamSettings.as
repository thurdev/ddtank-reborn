package flash.media
{
   [API("674")]
   public class H264VideoStreamSettings extends VideoStreamSettings
   {
      
      private var m_profile:String;
      
      private var m_level:String;
      
      public function H264VideoStreamSettings()
      {
         super();
         this.m_profile = H264Profile.BASELINE;
         this.m_level = H264Level.LEVEL_2_1;
      }
      
      override public function get codec() : String
      {
         return VideoCodec.H264AVC;
      }
      
      [cppcall]
      public function setProfileLevel(profile:String, level:String) : void
      {
         if(profile.toLowerCase() != H264Profile.BASELINE && profile.toLowerCase() != H264Profile.MAIN)
         {
            Error.throwError(ArgumentError,2008,"profile");
         }
         if(level != H264Level.LEVEL_1 && level.toLowerCase() != H264Level.LEVEL_1B && level != H264Level.LEVEL_1_1 && level != H264Level.LEVEL_1_2 && level != H264Level.LEVEL_1_3 && level != H264Level.LEVEL_2 && level != H264Level.LEVEL_2_1 && level != H264Level.LEVEL_2_2 && level != H264Level.LEVEL_3 && level != H264Level.LEVEL_3_1 && level != H264Level.LEVEL_3_2 && level != H264Level.LEVEL_4 && level != H264Level.LEVEL_4_1 && level != H264Level.LEVEL_4_2 && level != H264Level.LEVEL_5 && level != H264Level.LEVEL_5_1)
         {
            Error.throwError(ArgumentError,2008,"level");
         }
         this.m_profile = profile;
         this.m_level = level;
      }
      
      public function get profile() : String
      {
         return this.m_profile;
      }
      
      public function get level() : String
      {
         return this.m_level;
      }
   }
}

