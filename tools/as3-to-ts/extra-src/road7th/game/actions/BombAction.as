package road7th.game.actions
{
   import road7th.game.model.GameInfo;
   import road7th.game.object.SimpleBomb;
   
   public class BombAction
   {
      
      private var _time:int;
      
      private var _type:int;
      
      private var _param1:int;
      
      public var _param2:int;
      
      public var _param3:int;
      
      public var _param4:int;
      
      public function BombAction(time:int, type:int, param1:int, param2:int, param3:int, param4:int)
      {
         super();
         this._time = time;
         this._type = type;
         this._param1 = param1;
         this._param2 = param2;
         this._param3 = param3;
         this._param4 = param4;
      }
      
      public function get time() : int
      {
         return this._time;
      }
      
      public function get type() : int
      {
         return this._type;
      }
      
      public function execute(ball:SimpleBomb, game:GameInfo) : void
      {
         switch(this._type)
         {
            case BombActionType.BOMB:
               ball.x = this._param1;
               ball.y = this._param2;
               ball.bomb();
               break;
            case BombActionType.FLY_OUT:
               ball.die();
         }
      }
   }
}

