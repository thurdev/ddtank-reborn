package flash.events
{
   import flash.net.drm.DRMDeviceGroup;
   
   [API("692")]
   public class DRMDeviceGroupErrorEvent extends ErrorEvent
   {
      
      public static const ADD_TO_DEVICE_GROUP_ERROR:String = "addToDeviceGroupError";
      
      public static const REMOVE_FROM_DEVICE_GROUP_ERROR:String = "removeFromDeviceGroupError";
      
      private var m_deviceGroup:DRMDeviceGroup;
      
      private var m_subErrorID:int;
      
      private var m_systemUpdateNeeded:Boolean;
      
      private var m_drmUpdateNeeded:Boolean;
      
      public function DRMDeviceGroupErrorEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, errorDetail:String = "", errorCode:int = 0, subErrorID:int = 0, deviceGroup:DRMDeviceGroup = null, systemUpdateNeeded:Boolean = false, drmUpdateNeeded:Boolean = false)
      {
         super(type,bubbles,cancelable,errorDetail,errorCode);
         this.m_subErrorID = subErrorID;
         this.m_deviceGroup = deviceGroup;
         this.m_systemUpdateNeeded = systemUpdateNeeded;
         this.m_drmUpdateNeeded = drmUpdateNeeded;
      }
      
      override public function toString() : String
      {
         return formatToString("DRMDeviceGroupErrorEvent","type","bubbles","cancelable","eventPhase","errorID","subErrorID","text","systemUpdateNeeded","drmUpdateNeeded");
      }
      
      public function get subErrorID() : int
      {
         return this.m_subErrorID;
      }
      
      public function set subErrorID(value:int) : void
      {
         this.m_subErrorID = value;
      }
      
      public function set deviceGroup(value:DRMDeviceGroup) : *
      {
         this.m_deviceGroup = value;
      }
      
      public function get deviceGroup() : DRMDeviceGroup
      {
         return this.m_deviceGroup;
      }
      
      override public function clone() : Event
      {
         return new DRMDeviceGroupErrorEvent(type,bubbles,cancelable,text,errorID,this.subErrorID,this.m_deviceGroup,this.m_systemUpdateNeeded,this.m_drmUpdateNeeded);
      }
      
      public function get systemUpdateNeeded() : Boolean
      {
         return this.m_systemUpdateNeeded;
      }
      
      public function get drmUpdateNeeded() : Boolean
      {
         return this.m_drmUpdateNeeded;
      }
   }
}

