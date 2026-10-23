package flash.display
{
   import flash.events.EventDispatcher;
   
   [native(cls="MenuItemClass",gc="exact",instance="MenuItemObject",methods="auto")]
   [API("667")]
   [Event(name="preparing",type="flash.events.Event")]
   [Event(name="displaying",type="flash.events.Event")]
   [Event(name="select",type="flash.events.Event")]
   public class NativeMenuItem extends EventDispatcher
   {
      
      public function NativeMenuItem()
      {
         super();
      }
      
      public native function get enabled() : Boolean;
      
      public native function set enabled(param1:Boolean) : void;
   }
}

