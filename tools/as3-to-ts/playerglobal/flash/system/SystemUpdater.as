package flash.system
{
   import adobe.utils.*;
   import flash.events.*;
   
   [native(cls="SystemUpdaterClass",instance="SystemUpdaterObject",methods="auto",construct="check")]
   [API("667")]
   [Version("10.1")]
   [Event(name="cancel",type="flash.events.Event")]
   [Event(name="complete",type="flash.events.Event")]
   [Event(name="securityError",type="flash.events.SecurityErrorEvent")]
   [Event(name="ioError",type="flash.events.IOErrorEvent")]
   [Event(name="progress",type="flash.events.ProgressEvent")]
   [Event(name="status",type="flash.events.StatusEvent")]
   [Event(name="open",type="flash.events.Event")]
   public class SystemUpdater extends EventDispatcher
   {
      
      private var _pm:ProductManager = new ProductManager();
      
      public function SystemUpdater()
      {
         super();
         this._pm.addEventListener("cancel",this.onProductManagerEvent);
         this._pm.addEventListener("complete",this.onProductManagerEvent);
         this._pm.addEventListener("networkError",this.onProductManagerEvent);
         this._pm.addEventListener("diskError",this.onProductManagerEvent);
         this._pm.addEventListener("verifyError",this.onProductManagerEvent);
         this._pm.addEventListener("error",this.onProductManagerEvent);
      }
      
      public function update(type:String) : void
      {
         if(this._update(type,this._pm))
         {
            try
            {
               this._pm.doSelfUpgrade(Capabilities.os);
            }
            catch(err:Error)
            {
               _cancel(false,_pm);
               throw err;
            }
         }
      }
      
      public function cancel() : void
      {
         this._cancel(true,this._pm);
      }
      
      private function onProductManagerEvent(e:Event) : void
      {
         switch(e.type)
         {
            case "networkError":
            case "diskError":
            case "verifyError":
            case "error":
               this._cancel(false,this._pm);
               dispatchEvent(new IOErrorEvent(IOErrorEvent.IO_ERROR,false,false,null,null));
               break;
            case "cancel":
            case "complete":
               this._cancel(false,this._pm);
            default:
               dispatchEvent(e.clone());
         }
      }
      
      private native function _update(param1:String, param2:ProductManager) : Boolean;
      
      private native function _cancel(param1:Boolean, param2:ProductManager) : void;
   }
}

