package road7th.game.actions
{
   import flash.geom.Point;
   import road7th.game.model.Living;
   import road7th.manager.GameManager;
   
   public class BoguAI
   {
      
      private var _living:Living;
      
      private var _oldPos:Point = null;
      
      public function BoguAI(living:Living, targetPt:Point)
      {
         super();
         this._oldPos = living.pos;
         this._living = living;
         this._living.moveTo(1,targetPt,-1,true,LivingActionType.Walk,3,LivingActionType.Stand,this._goBack);
      }
      
      private function _goBack() : void
      {
         this._living.moveTo(1,this._oldPos,-1,true,LivingActionType.Walk,3,LivingActionType.Stand,this._aiOver);
      }
      
      private function _aiOver() : void
      {
         this._living.pos = this._oldPos;
         GameManager.Instance.nextTurn();
         this._living = null;
      }
   }
}

