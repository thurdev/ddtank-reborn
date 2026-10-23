package road7th.game.view.smallMap
{
   import flash.display.Graphics;
   import phy.object.SmallObject;
   import road7th.game.model.Living;
   import road7th.utils.TeamUtils;
   
   public class SmallLiving extends SmallObject
   {
      
      protected var _info:Living;
      
      public function SmallLiving()
      {
         super();
      }
      
      public function set info(value:Living) : void
      {
         this._info = value;
         this.fitInfo();
      }
      
      public function get info() : Living
      {
         return this._info;
      }
      
      override protected function draw() : void
      {
         var pen:Graphics = graphics;
         pen.clear();
         pen.beginFill(_color);
         pen.drawCircle(0,0,_radius);
         pen.endFill();
      }
      
      protected function fitInfo() : void
      {
         color = TeamUtils.getTeamColor(this._info.team);
      }
   }
}

