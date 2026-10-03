package ddt.data.goods
{
   import ddt.manager.LanguageMgr;
   
   public class QualityType
   {
      
      private static var _QUALITY_STRING:Array;
      
      public static function get QUALITY_STRING() : Array
      {
         if(_QUALITY_STRING == null)
         {
            _QUALITY_STRING = ["",LanguageMgr.GetTranslation("tank.data.QualityType.cucao"),LanguageMgr.GetTranslation("tank.data.QualityType.putong"),LanguageMgr.GetTranslation("tank.data.QualityType.youxiu"),LanguageMgr.GetTranslation("tank.data.QualityType.jingliang"),LanguageMgr.GetTranslation("tank.data.QualityType.zhuoyue"),LanguageMgr.GetTranslation("tank.data.QualityType.chuanshuo"),LanguageMgr.GetTranslation("tank.data.QualityType.shenqi")];
         }
         return _QUALITY_STRING;
      }
      
      public static const QUALITY_COLOR:Array = [0,14803425,2031360,28893,10696174,16744448,16711833,15060096];
      
      public function QualityType()
      {
         super();
      }
   }
}

