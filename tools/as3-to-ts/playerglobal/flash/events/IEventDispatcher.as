package flash.events
{
   public interface IEventDispatcher
   {
      
      function addEventListener(param1:String, param2:Function, param3:Boolean = false, param4:int = 0, param5:Boolean = false) : void;
      
      function removeEventListener(param1:String, param2:Function, param3:Boolean = false) : void;
      
      function dispatchEvent(param1:Event) : Boolean;
      
      function hasEventListener(param1:String) : Boolean;
      
      function willTrigger(param1:String) : Boolean;
   }
}

