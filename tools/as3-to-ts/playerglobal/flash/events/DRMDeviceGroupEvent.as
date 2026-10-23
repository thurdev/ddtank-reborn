package flash.events
{
   import flash.net.drm.DRMDeviceGroup;
   
   [API("692")]
   public class DRMDeviceGroupEvent extends Event
   {
      
      public static const ADD_TO_DEVICE_GROUP_COMPLETE:String = "addToDeviceGroupComplete";
      
      public static const REMOVE_FROM_DEVICE_GROUP_COMPLETE:String = "removeFromDeviceGroupComplete";
      
      private var m_deviceGroup:DRMDeviceGroup;
      
      public function DRMDeviceGroupEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, deviceGroup:DRMDeviceGroup = null)
      {
         super(type,bubbles,cancelable);
         this.m_deviceGroup = deviceGroup;
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
         return new DRMDeviceGroupEvent(type,bubbles,cancelable,this.m_deviceGroup);
      }
      
      override public function toString() : String
      {
         return formatToString("DRMDeviceGroupEvent","type","bubbles","cancelable","eventPhase","deviceGroup");
      }
   }
}

