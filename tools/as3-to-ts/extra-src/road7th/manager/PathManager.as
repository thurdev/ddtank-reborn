package road7th.manager
{
   public class PathManager
   {
      
      private static var _site:String;
      
      private static var _language:String;
      
      private static var _flashSite:String = "";
      
      private static var _requestPath:String = "";
      
      public function PathManager()
      {
         super();
      }
      
      public static function get FLASHSITE() : String
      {
         return _flashSite;
      }
      
      public static function get site() : String
      {
         return _site;
      }
      
      public static function initialize(config:XML) : void
      {
         _flashSite = config.FLASHSITE.@value;
         _site = config.SITE.@value;
         _language = config.LANGUAGE.@value;
         _requestPath = config.REQUEST_PATH.@value;
      }
      
      public static function solveRequestPath(path:String) : String
      {
         return _requestPath + path + "?rn=" + Math.random();
      }
      
      public static function solveHatPath(sex:String, id:int) : String
      {
         var s:String = sex == "male" ? "m" : "f";
         return _site + "image/equip/" + s + "/head/head" + id + "/1/game.png";
      }
      
      public static function solveWeaponPath(id:String) : String
      {
         return _site + "image/arm/" + id + "/1/1/game.png";
      }
      
      public static function solveMapNPCPath(id:String) : String
      {
         return _site + "image/game/living/living" + id + ".swf";
      }
      
      public static function solveCharacterPath(sex:String) : String
      {
         return _flashSite + "ui/" + _language + "/img/trainer/character/" + sex + ".png";
      }
      
      public static function solveResourcePath(resource:String) : String
      {
         return _flashSite + "ui/" + _language + "/swf/" + resource + ".swf?rn=" + Math.random();
      }
      
      public static function solveBombPath(id:int) : String
      {
         return _site + "bomb/" + id + ".swf" + "?lv=" + Math.random();
      }
      
      public static function get mapback() : String
      {
         return _site + "image/map/{id}/back.jpg";
      }
      
      public static function get mapdead() : String
      {
         return _site + "image/map/{id}/dead.png";
      }
      
      public static function solveBlastOut(id:int) : String
      {
         return _site + "image/bomb/blastOut/blastOut" + id + ".swf" + "?lv=" + Math.random();
      }
      
      public static function solveBullet(blastOutID:int) : String
      {
         return _site + "image/bomb/bullet/bullet" + blastOutID + ".swf" + "?lv=" + Math.random();
      }
      
      public static function solveCrater(craterID:int) : String
      {
         return _site + "image/bomb/crater/" + craterID + "/crater.png";
      }
      
      public static function solveCraterBrink(id:int) : String
      {
         return _site + "image/bomb/crater/" + id + "/craterBrink.png";
      }
   }
}

