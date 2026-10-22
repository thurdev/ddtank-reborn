package flash.net.drm
{
   import flash.events.*;
   
   [native(cls="DRMAddToDeviceGroupContextClass",instance="DRMAddToDeviceGroupContextObject",methods="auto")]
   internal class DRMAddToDeviceGroupContext extends DRMManagerSession
   {
      
      private var m_deviceGroup:DRMDeviceGroup;
      
      public function DRMAddToDeviceGroupContext()
      {
         super();
      }
      
      public function addToDeviceGroup(deviceGroup:DRMDeviceGroup, forceRefresh:Boolean) : void
      {
         var errorCode:uint = 0;
         if(!m_isInSession)
         {
            m_isInSession = true;
            this.m_deviceGroup = deviceGroup;
            errorCode = uint(this.addToDeviceGroupInner(deviceGroup,forceRefresh));
            if(errorCode != 0)
            {
               m_isInSession = false;
               errorCodeToThrow(errorCode);
            }
            else
            {
               setTimerUp();
            }
         }
      }
      
      override public function onSessionComplete() : void
      {
         var event:DRMDeviceGroupEvent = new DRMDeviceGroupEvent(DRMDeviceGroupEvent.ADD_TO_DEVICE_GROUP_COMPLETE);
         event.deviceGroup = this.m_deviceGroup;
         event.deviceGroup.name = this.getResultInner();
         dispatchEvent(event);
      }
      
      private native function getResultInner() : String;
      
      override public function onSessionError() : void
      {
         var event:DRMDeviceGroupErrorEvent = new DRMDeviceGroupErrorEvent(DRMDeviceGroupErrorEvent.ADD_TO_DEVICE_GROUP_ERROR,false,false,getLastServerErrorString(),getLastError());
         event.deviceGroup = this.m_deviceGroup;
         event.subErrorID = getLastSubErrorID();
         dispatchEvent(event);
      }
      
      private native function addToDeviceGroupInner(param1:DRMDeviceGroup, param2:Boolean) : uint;
   }
}

