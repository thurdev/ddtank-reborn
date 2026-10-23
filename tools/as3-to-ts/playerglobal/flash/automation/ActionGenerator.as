package flash.automation
{
   [native(cls="ActionGeneratorClass",instance="ActionGeneratorObject",methods="auto")]
   [ExcludeClass]
   public class ActionGenerator
   {
      
      public function ActionGenerator()
      {
         super();
      }
      
      public native function generateActions(param1:Array) : void;
      
      public function generateAction(action:AutomationAction) : void
      {
         var singleAction:Array = new Array(action);
         this.generateActions(singleAction);
      }
   }
}

