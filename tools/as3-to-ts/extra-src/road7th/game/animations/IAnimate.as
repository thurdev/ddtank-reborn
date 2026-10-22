package road7th.game.animations
{
   import flash.display.DisplayObject;
   
   public interface IAnimate
   {
      
      function get level() : int;
      
      function prepare(param1:AnimationSet) : void;
      
      function canAct() : Boolean;
      
      function update(param1:DisplayObject) : Boolean;
      
      function canReplace(param1:IAnimate) : Boolean;
      
      function cancel() : void;
      
      function get finish() : Boolean;
   }
}

