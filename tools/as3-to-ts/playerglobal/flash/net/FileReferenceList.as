package flash.net
{
   import flash.events.EventDispatcher;
   
   [native(cls="FileReferenceListClass",instance="FileReferenceListObject",methods="auto")]
   [Event(name="select",type="flash.events.Event")]
   [Event(name="cancel",type="flash.events.Event")]
   public class FileReferenceList extends EventDispatcher
   {
      
      public function FileReferenceList()
      {
         super();
      }
      
      public native function get fileList() : Array;
      
      public native function browse(param1:Array = null) : Boolean;
   }
}

