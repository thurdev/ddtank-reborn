package road7th.game.animations
{
   import phy.object.PhysicalObj;
   
   public class PhysicalObjFocusAnimation extends BaseSetCenterAnimation
   {
      
      private var _phy:PhysicalObj;
      
      public function PhysicalObjFocusAnimation(phy:PhysicalObj, life:int = 100, offsetY:int = 0)
      {
         super(phy.x,phy.y + offsetY,life);
         this._phy = phy;
         _level = AnimationLevel.MIDDLE;
      }
      
      override public function canReplace(anit:IAnimate) : Boolean
      {
         var at:PhysicalObjFocusAnimation = anit as PhysicalObjFocusAnimation;
         if(Boolean(at) && at._phy != this._phy)
         {
         }
         return true;
      }
   }
}

