package flash.display
{
   import flash.events.EventDispatcher;
   
   [native(cls="MenuClass",gc="exact",instance="MenuObject",methods="auto",construct="check")]
   [API("667")]
   [Event(name="preparing",type="flash.events.Event")]
   [Event(name="displaying",type="flash.events.Event")]
   [Event(name="select",type="flash.events.Event")]
   public class NativeMenu extends EventDispatcher
   {
      
      public function NativeMenu()
      {
         super();
      }
   }
}

