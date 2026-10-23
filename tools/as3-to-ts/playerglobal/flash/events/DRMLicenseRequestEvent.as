package flash.events
{
   import flash.net.drm.*;
   
   public class DRMLicenseRequestEvent extends Event
   {
      
      public static const LICENSE_REQUEST:String = "licenseRequest";
      
      private var m_serverURL:String;
      
      public function DRMLicenseRequestEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, inServerURL:String = null)
      {
         super(type,bubbles,cancelable);
         this.m_serverURL = inServerURL;
      }
      
      override public function clone() : Event
      {
         return new DRMLicenseRequestEvent(type,bubbles,cancelable,this.serverURL);
      }
      
      public function get serverURL() : String
      {
         return this.m_serverURL;
      }
      
      public function set serverURL(value:String) : void
      {
         this.m_serverURL = value;
      }
   }
}

