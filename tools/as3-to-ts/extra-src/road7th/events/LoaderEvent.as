package road7th.events
{
   import flash.events.Event;
   
   public class LoaderEvent extends Event
   {
      
      public static const PROGRESS:String = "progress";
      
      public static const COMPLETE:String = "complete";
      
      public static const START:String = "start";
      
      public static const ERROR:String = "error";
      
      public function LoaderEvent(type:String)
      {
         super(type,false,false);
      }
   }
}

