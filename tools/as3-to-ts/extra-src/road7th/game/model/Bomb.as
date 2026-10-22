package road7th.game.model
{
   import flash.geom.Point;
   import flash.geom.Rectangle;
   import road7th.game.actions.BombActionType;
   
   public class Bomb
   {
      
      private static var BombCount:int = 0;
      
      public static var defaultBombRect:Rectangle = new Rectangle(-30,-30,60,60);
      
      public static const FLY_BOMB:int = 3;
      
      public var Id:int;
      
      public var X:int;
      
      public var Y:int;
      
      public var VX:int;
      
      public var VY:int;
      
      public var Actions:Array = new Array();
      
      public var UsedActions:Array = new Array();
      
      public var bombId:int;
      
      public var changedPartical:String;
      
      public var Template:BallInfo;
      
      public var IsHole:Boolean;
      
      public var damageMod:Number;
      
      public function Bomb()
      {
         super();
         this.bombId = BombCount++;
      }
      
      public function set attack(value:int) : void
      {
         this.Template.attack = value;
      }
      
      public function get attack() : int
      {
         return this.Template.attack;
      }
      
      public function get target() : Point
      {
         for(var i:int = 0; i < this.Actions.length; i++)
         {
            if(this.Actions[i].type == BombActionType.BOMB)
            {
               return new Point(this.Actions[i].param1,this.Actions[i].param2);
            }
            if(this.Actions[i].type == BombActionType.FLY_OUT)
            {
               return new Point(this.Actions[i].param1,this.Actions[i].param2);
            }
         }
         for(var j:int = 0; j < this.UsedActions.length; j++)
         {
            if(this.UsedActions[j].type == BombActionType.BOMB)
            {
               return new Point(this.UsedActions[j].param1,this.UsedActions[j].param2);
            }
            if(this.UsedActions[j].type == BombActionType.FLY_OUT)
            {
               return new Point(this.UsedActions[j].param1,this.UsedActions[j].param2);
            }
         }
         return null;
      }
   }
}

