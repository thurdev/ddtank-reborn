package flash.net.drm
{
   import flash.events.*;
   import flash.utils.*;
   
   [native(cls="DRMModuleCycleProviderClass",instance="DRMModuleCycleProviderObject",methods="auto",construct="native")]
   internal class DRMModuleCycleProvider
   {
      
      private var m_heartBeatTimer:Timer;
      
      public function DRMModuleCycleProvider()
      {
         super();
      }
      
      [cppcall]
      private function startTimer() : void
      {
         if(this.m_heartBeatTimer == null)
         {
            this.m_heartBeatTimer = new Timer(30,0);
            this.m_heartBeatTimer.addEventListener(TimerEvent.TIMER,this.onHeartBeat);
         }
         this.m_heartBeatTimer.start();
      }
      
      private function onHeartBeat(ev:TimerEvent) : *
      {
         var continueTimer:Boolean = Boolean(this.iHeartBeat());
         if(!continueTimer)
         {
            this.m_heartBeatTimer.stop();
            this.m_heartBeatTimer.removeEventListener(TimerEvent.TIMER,this.onHeartBeat);
         }
      }
      
      private native function iHeartBeat() : Boolean;
   }
}

