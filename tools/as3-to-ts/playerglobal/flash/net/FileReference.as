package flash.net
{
   import flash.errors.*;
   import flash.events.EventDispatcher;
   import flash.utils.*;
   
   [native(cls="FileReferenceClass",instance="FileReferenceObject",methods="auto")]
   [Event(name="uploadCompleteData",type="flash.events.DataEvent")]
   [Event(name="httpResponseStatus",type="flash.events.HTTPStatusEvent")]
   [Event(name="httpStatus",type="flash.events.HTTPStatusEvent")]
   [Event(name="select",type="flash.events.Event")]
   [Event(name="securityError",type="flash.events.SecurityErrorEvent")]
   [Event(name="progress",type="flash.events.ProgressEvent")]
   [Event(name="open",type="flash.events.Event")]
   [Event(name="ioError",type="flash.events.IOErrorEvent")]
   [Event(name="complete",type="flash.events.Event")]
   [Event(name="permissionStatus",type="flash.events.PermissionEvent")]
   [Event(name="cancel",type="flash.events.Event")]
   public class FileReference extends EventDispatcher
   {
      
      private static const kInvalidParamError:uint = 2004;
      
      private static const kNullPointerError:uint = 2007;
      
      private static const kInvalidCallError:uint = 2037;
      
      private static const kLocalSecurityError:uint = 2028;
      
      public function FileReference()
      {
         super();
      }
      
      private static native function _ensureIsRootPlayer() : void;
      
      public native function get creationDate() : Date;
      
      public native function get creator() : String;
      
      public native function get modificationDate() : Date;
      
      public native function get name() : String;
      
      public native function get size() : Number;
      
      public native function get type() : String;
      
      public native function cancel() : void;
      
      public native function download(param1:URLRequest, param2:String = null) : void;
      
      public native function upload(param1:URLRequest, param2:String = "Filedata", param3:Boolean = false) : void;
      
      [Version("10")]
      public native function get data() : ByteArray;
      
      private native function _load(param1:ByteArray) : void;
      
      private native function _save(param1:ByteArray, param2:String) : void;
      
      [Version("10")]
      public function load() : void
      {
         this._load(new ByteArray());
      }
      
      [Version("10")]
      public function save(data:*, defaultFileName:String = null) : void
      {
         var d:ByteArray;
         var x:XML = null;
         _ensureIsRootPlayer();
         d = new ByteArray();
         if(data == null)
         {
            throw new ArgumentError("data");
         }
         if(data is String)
         {
            d.writeUTFBytes(data as String);
         }
         else if(data is XML)
         {
            d.writeUTFBytes((data as XML).toXMLString());
         }
         else if(data is ByteArray)
         {
            d.writeBytes(data as ByteArray);
         }
         else
         {
            try
            {
               d.writeUTFBytes(data);
            }
            catch(e:Error)
            {
               throw new ArgumentError("data");
            }
         }
         d.position = 0;
         if(defaultFileName == null)
         {
            defaultFileName = "";
         }
         this._save(d,defaultFileName);
      }
      
      public native function browse(param1:Array = null) : Boolean;
   }
}

