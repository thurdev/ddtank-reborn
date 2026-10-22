package road7th.game.model
{
   import flash.events.EventDispatcher;
   
   public class SelfInfo extends EventDispatcher
   {
      
      private var _sex:Boolean;
      
      public function SelfInfo()
      {
         super();
      }
      
      public function get sex() : Boolean
      {
         return this._sex;
      }
      
      public function set sex(value:Boolean) : void
      {
         if(this._sex == value)
         {
            return;
         }
         this._sex = value;
      }
   }
}

