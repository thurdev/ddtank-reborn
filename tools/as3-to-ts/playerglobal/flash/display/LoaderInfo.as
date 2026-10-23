package flash.display
{
   import flash.errors.*;
   import flash.events.*;
   import flash.system.ApplicationDomain;
   import flash.utils.ByteArray;
   
   [native(cls="LoaderInfoClass",gc="exact",instance="LoaderInfoObject",methods="auto",construct="native")]
   [Exclude(name="dispatchEvent",kind="method")]
   [Event(name="httpStatus",type="flash.events.HTTPStatusEvent")]
   [Event(name="unload",type="flash.events.Event")]
   [Event(name="progress",type="flash.events.ProgressEvent")]
   [Event(name="open",type="flash.events.Event")]
   [Event(name="ioError",type="flash.events.IOErrorEvent")]
   [Event(name="init",type="flash.events.Event")]
   [Event(name="complete",type="flash.events.Event")]
   public class LoaderInfo extends EventDispatcher
   {
      
      public function LoaderInfo()
      {
         super();
      }
      
      public static native function getLoaderInfoByDefinition(param1:Object) : LoaderInfo;
      
      public native function get loaderURL() : String;
      
      public native function get url() : String;
      
      public native function get isURLInaccessible() : Boolean;
      
      public native function get bytesLoaded() : uint;
      
      public native function get bytesTotal() : uint;
      
      public native function get applicationDomain() : ApplicationDomain;
      
      public native function get swfVersion() : uint;
      
      public native function get actionScriptVersion() : uint;
      
      public native function get frameRate() : Number;
      
      public function get parameters() : Object
      {
         var k:String = null;
         var args:Object = this._getArgs();
         var rtn:Object = {};
         for(k in args)
         {
            rtn[k] = args[k];
         }
         return rtn;
      }
      
      public native function get width() : int;
      
      public native function get height() : int;
      
      public native function get contentType() : String;
      
      public native function get sharedEvents() : EventDispatcher;
      
      public native function get parentSandboxBridge() : Object;
      
      public native function set parentSandboxBridge(param1:Object) : void;
      
      public native function get childSandboxBridge() : Object;
      
      public native function set childSandboxBridge(param1:Object) : void;
      
      [Inspectable(environment="none")]
      override public function dispatchEvent(event:Event) : Boolean
      {
         Error.throwError(IllegalOperationError,2118);
         return false;
      }
      
      public native function get sameDomain() : Boolean;
      
      public native function get childAllowsParent() : Boolean;
      
      public native function get parentAllowsChild() : Boolean;
      
      public native function get loader() : Loader;
      
      public native function get content() : DisplayObject;
      
      public native function get bytes() : ByteArray;
      
      private native function _getArgs() : Object;
      
      [Version("10.1")]
      public function get uncaughtErrorEvents() : UncaughtErrorEvents
      {
         var _uncaughtErrorEvents:UncaughtErrorEvents = this._getUncaughtErrorEvents();
         if(!_uncaughtErrorEvents)
         {
            _uncaughtErrorEvents = new UncaughtErrorEvents();
            this._setUncaughtErrorEvents(_uncaughtErrorEvents);
         }
         return _uncaughtErrorEvents;
      }
      
      private native function _getUncaughtErrorEvents() : UncaughtErrorEvents;
      
      private native function _setUncaughtErrorEvents(param1:UncaughtErrorEvents) : void;
   }
}

