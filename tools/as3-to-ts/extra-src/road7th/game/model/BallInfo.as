package road7th.game.model
{
   import flash.geom.Point;
   import flash.geom.Rectangle;
   
   public class BallInfo
   {
      
      public var ID:int = 2;
      
      public var Name:String;
      
      public var Mass:Number = 1;
      
      public var Power:Number;
      
      public var Radii:Number;
      
      public var SpinV:Number = 1000;
      
      public var SpinVA:Number = 1;
      
      public var Amount:Number = 1;
      
      public var Wind:int;
      
      public var Weight:int;
      
      public var DragIndex:int;
      
      public var Shake:Boolean;
      
      public var ShootSound:String;
      
      public var BombSound:String;
      
      public var ActionType:int;
      
      public var blastOutID:int;
      
      public var craterID:int;
      
      public var FlyingPartical:int;
      
      public var attack:int;
      
      public var particalID:int;
      
      public var bombRect:Rectangle = new Rectangle(-40,-40,80,80);
      
      public function BallInfo()
      {
         super();
      }
      
      public function getCarrayBall() : Point
      {
         return new Point(0,90);
      }
   }
}

