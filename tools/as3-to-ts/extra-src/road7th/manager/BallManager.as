package road7th.manager
{
   import flash.display.Bitmap;
   import flash.display.MovieClip;
   import flash.utils.Dictionary;
   import road7th.game.model.BombAsset;
   import road7th.utils.ClassUtils;
   
   public class BallManager
   {
      
      public static const CRATER:int = 0;
      
      public static const CREATER_BRINK:int = 1;
      
      private static const _gameInBombAssets:Dictionary = new Dictionary();
      
      public function BallManager()
      {
         super();
      }
      
      public static function addBombAsset(id:int, asset:Bitmap, type:int) : void
      {
         if(_gameInBombAssets[id] == null)
         {
            _gameInBombAssets[id] = new BombAsset();
         }
         if(type == CRATER)
         {
            if(_gameInBombAssets[id].crater == null)
            {
               _gameInBombAssets[id].crater = asset;
            }
         }
         else if(type == CREATER_BRINK)
         {
            if(_gameInBombAssets[id].craterBrink == null)
            {
               _gameInBombAssets[id].craterBrink = asset;
            }
         }
      }
      
      public static function hasBombAsset(id:int) : Boolean
      {
         return _gameInBombAssets[id] != null;
      }
      
      public static function getBombAsset(id:int) : BombAsset
      {
         return _gameInBombAssets[id];
      }
      
      public static function solveBallWeaponMovieName(bombid:int) : String
      {
         return "tank.resource.bombs.BombMovie" + bombid;
      }
      
      public static function createBallWeaponMovie(bombid:int) : MovieClip
      {
         return ClassUtils.CreatInstance(solveBallWeaponMovieName(bombid)) as MovieClip;
      }
      
      public static function createShootMovieMovie(id:int) : MovieClip
      {
         return ClassUtils.CreatInstance(solveShootMovieMovieName(id)) as MovieClip;
      }
      
      public static function solveShootMovieMovieName(id:int) : String
      {
         return "shootMovie" + id;
      }
      
      public static function createBulletMovie(id:int) : MovieClip
      {
         return ClassUtils.CreatInstance(solveBulletMovieName(id)) as MovieClip;
      }
      
      public static function solveBulletMovieName(id:int) : String
      {
         return "bullet" + id;
      }
      
      public static function createBlastOutMovie(id:int) : MovieClip
      {
         return ClassUtils.CreatInstance(solveBlastOutMovieName(id)) as MovieClip;
      }
      
      public static function solveBlastOutMovieName(id:int) : String
      {
         return "blastOutMovie" + id;
      }
   }
}

