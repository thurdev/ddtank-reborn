package road7th.data
{
   import flash.geom.Rectangle;
   import road7th.game.model.BallInfo;
   
   public class BallInfoFactory
   {
      
      public function BallInfoFactory()
      {
         super();
      }
      
      public static function createBallInfo(id:int) : BallInfo
      {
         var fun:Function = BallInfoFactory["ballInfo" + id] as Function;
         if(fun != null)
         {
            return BallInfoFactory["ballInfo" + id]();
         }
         return null;
      }
      
      private static function ballInfo121() : BallInfo
      {
         var ballInfo:* = null;
         ballInfo = new BallInfo();
         ballInfo.ID = 121;
         ballInfo.ShootSound = "029";
         ballInfo.BombSound = "089";
         ballInfo.particalID = 3;
         ballInfo.Mass = 10;
         ballInfo.Amount = 1;
         ballInfo.blastOutID = 121;
         ballInfo.craterID = 121;
         ballInfo.DragIndex = 1;
         ballInfo.FlyingPartical = 3;
         ballInfo.Power = 1;
         ballInfo.Radii = 55;
         ballInfo.SpinV = 180;
         ballInfo.SpinVA = 1;
         ballInfo.Weight = 70;
         ballInfo.Wind = 240;
         return ballInfo;
      }
      
      private static function createBombRect(baseRect:Rectangle, factor:Number) : Rectangle
      {
         var rect:Rectangle = new Rectangle();
         rect.x = baseRect.x * factor;
         rect.y = baseRect.y * factor;
         rect.width = baseRect.width * factor;
         rect.height = baseRect.height * factor;
         return rect;
      }
   }
}

