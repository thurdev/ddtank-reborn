package road7th.events
{
   import flash.events.Event;
   
   public class MapEvent extends Event
   {
      
      public static const AddThing:String = "addThing";
      
      public static const RemoveThing:String = "removeThing";
      
      public static const Update:String = "update";
      
      private var _params:Array;
      
      public function MapEvent(type:String, ... arg)
      {
         this._params = arg;
         super(type);
      }
      
      public function get params() : Array
      {
         return this._params;
      }
   }
}

