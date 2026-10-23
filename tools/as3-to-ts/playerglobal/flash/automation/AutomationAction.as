package flash.automation
{
   [ExcludeClass]
   public class AutomationAction
   {
      
      private var _type:String = "";
      
      public function AutomationAction()
      {
         super();
      }
      
      public function get type() : String
      {
         return this._type;
      }
      
      public function set type(value:String) : void
      {
         this._type = value;
      }
   }
}

