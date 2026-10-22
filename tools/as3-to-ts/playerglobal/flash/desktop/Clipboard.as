package flash.desktop
{
   import flash.errors.*;
   import flash.utils.*;
   
   [native(cls="ClipboardClass",instance="ClipboardObject",methods="auto",construct="check")]
   [Version("air1")]
   [Version("10")]
   public class Clipboard
   {
      
      private static var _fromFlash:Dictionary;
      
      private static var _toFlash:Dictionary;
      
      private static const LIFETIME_ERROR:String = "Attempt to access a dead clipboard";
      
      private static const READ_ACCESS_ERROR:String = "Reading from clipboard not permitted in this context";
      
      private static const WRITE_ACCESS_ERROR:String = "Writing to clipboard not permitted in this context";
      
      private static var _wasFormatMapInitialized:Boolean = false;
      
      public function Clipboard()
      {
         super();
         initFormatMap();
      }
      
      public static native function get generalClipboard() : Clipboard;
      
      private static function isSystemFormat(format:String) : Boolean
      {
         return ClipboardFormats.FLASH_PREFIX == format.substr(0,ClipboardFormats.FLASH_PREFIX.length) || ClipboardFormats.AIR_PREFIX == format.substr(0,ClipboardFormats.AIR_PREFIX.length);
      }
      
      private static function initFormatMap() : void
      {
         if(!_wasFormatMapInitialized)
         {
            _fromFlash = new Dictionary();
            _toFlash = new Dictionary();
            addFormatMapping(ClipboardFormats.TEXT_FORMAT,function(clipboard:Clipboard, text:String):void
            {
               clipboard.putString(text);
            },function(clipboard:Clipboard):String
            {
               return clipboard.getString();
            });
            addFormatMapping(ClipboardFormats.HTML_FORMAT,function(clipboard:Clipboard, html:String):void
            {
               clipboard.putHTML(html);
            },function(clipboard:Clipboard):String
            {
               return clipboard.getHTML();
            });
            addFormatMapping(ClipboardFormats.RICH_TEXT_FORMAT,function(clipboard:Clipboard, rtf:ByteArray):void
            {
               clipboard.putRTF(rtf);
            },function(clipboard:Clipboard):ByteArray
            {
               return clipboard.getRTF();
            });
            _wasFormatMapInitialized = true;
         }
      }
      
      private static function addFormatMapping(flashFormat:String, exportFromFlash:Function, importToFlash:Function) : *
      {
         _fromFlash[flashFormat] = exportFromFlash;
         _toFlash[flashFormat] = importToFlash;
      }
      
      public native function get formats() : Array;
      
      public native function clear() : void;
      
      public native function clearData(param1:String) : void;
      
      [cppcall]
      public function setData(format:String, data:Object, serializable:Boolean = true) : Boolean
      {
         var fmtIsNull:Boolean = format == null;
         if(fmtIsNull || data == null)
         {
            if(this.swfVersion >= 10)
            {
               Error.throwError(TypeError,2007,fmtIsNull ? "format" : "data");
            }
            else if(fmtIsNull)
            {
               return false;
            }
         }
         if(format == ClipboardFormats.URL_FORMAT || format == ClipboardFormats.FILE_LIST_FORMAT || format == ClipboardFormats.BITMAP_FORMAT || format == ClipboardFormats.FILE_PROMISE_LIST_FORMAT)
         {
            return false;
         }
         this.checkAccess(false,true);
         return this.convertFlashFormat(format,data,serializable);
      }
      
      public function setDataHandler(format:String, handler:Function, serializable:Boolean = true) : Boolean
      {
         var fullHandler:Function;
         var toNative:* = undefined;
         if(this.swfVersion >= 10)
         {
            if(format == null)
            {
               Error.throwError(TypeError,2007,"format");
            }
            if(handler == null)
            {
               Error.throwError(TypeError,2007,"handler");
            }
         }
         if(format == ClipboardFormats.URL_FORMAT || format == ClipboardFormats.FILE_LIST_FORMAT || format == ClipboardFormats.BITMAP_FORMAT || format == ClipboardFormats.FILE_PROMISE_LIST_FORMAT)
         {
            return false;
         }
         this.checkAccess(false,true);
         fullHandler = function():void
         {
            var result:Object = handler() as Object;
            setHandlerStoringData(true);
            setData(format,result,serializable);
            setHandlerStoringData(false);
         };
         if(isSystemFormat(format))
         {
            toNative = _fromFlash[format];
            if(!toNative)
            {
               return false;
            }
            this.nativeSetHandler(format,fullHandler);
         }
         else
         {
            this.nativeSetHandler(ClipboardFormats.REFERENCE_PREFIX + format,fullHandler);
            if(serializable)
            {
               this.nativeSetHandler(ClipboardFormats.SERIALIZATION_PREFIX + format,fullHandler);
            }
         }
         return true;
      }
      
      public function getData(format:String, transferMode:String = "originalPreferred") : Object
      {
         var result:Object = null;
         this.checkAccess(true,false);
         result = this.convertNativeFormat(format);
         if(Boolean(result))
         {
            return result;
         }
         switch(transferMode)
         {
            case ClipboardTransferMode.ORIGINAL_PREFERRED:
               result = this.getOriginal(format);
               if(result == undefined)
               {
                  result = this.getClone(format);
               }
               return result;
            case ClipboardTransferMode.ORIGINAL_ONLY:
               return this.getOriginal(format);
            case ClipboardTransferMode.CLONE_PREFERRED:
               result = this.getClone(format);
               if(result == undefined)
               {
                  result = this.getOriginal(format);
               }
               return result;
            case ClipboardTransferMode.CLONE_ONLY:
               return this.getClone(format);
            default:
               throw new Error("Illegal value for transferMode: " + transferMode);
         }
      }
      
      public function hasFormat(format:String) : Boolean
      {
         this.checkAccess(false,false);
         return this.formats.indexOf(format) != -1;
      }
      
      private function getOriginal(format:String) : Object
      {
         return this.convertNativeFormat(ClipboardFormats.REFERENCE_PREFIX + format);
      }
      
      private function getClone(format:String) : Object
      {
         return this.convertNativeFormat(ClipboardFormats.SERIALIZATION_PREFIX + format);
      }
      
      private native function get alive() : Boolean;
      
      private native function get canReadContents() : Boolean;
      
      private native function get canWriteContents() : Boolean;
      
      private function checkAccess(requestRead:Boolean, requestWrite:Boolean) : void
      {
         if(!this.alive)
         {
            throw new IllegalOperationError(LIFETIME_ERROR);
         }
         if(requestRead && !this.canReadContents)
         {
            throw new SecurityError(READ_ACCESS_ERROR);
         }
         if(requestWrite && !this.canWriteContents)
         {
            throw new SecurityError(WRITE_ACCESS_ERROR);
         }
      }
      
      private native function nativeSetHandler(param1:String, param2:Function) : void;
      
      private native function getObjectReference(param1:String) : Object;
      
      private native function putObjectReference(param1:String, param2:Object) : void;
      
      private function getDeserialization(format:String) : Object
      {
         var bytes:ByteArray = this.getByteArray(format);
         if(!bytes)
         {
            return null;
         }
         return bytes.readObject();
      }
      
      private function putSerialization(format:String, data:Object) : void
      {
         var bytes:ByteArray = new ByteArray();
         bytes.writeObject(data);
         this.putByteArray(format,bytes);
      }
      
      private native function getString() : String;
      
      private native function putString(param1:String) : void;
      
      private native function getHTML() : String;
      
      private native function putHTML(param1:String) : void;
      
      private native function getRTF() : ByteArray;
      
      private native function putRTF(param1:ByteArray) : void;
      
      private native function getByteArray(param1:String) : ByteArray;
      
      private native function putByteArray(param1:String, param2:ByteArray) : void;
      
      private function convertNativeFormat(format:String) : Object
      {
         var toFlash:Function = _toFlash[format];
         if(Boolean(toFlash))
         {
            return toFlash(this);
         }
         var isReference:Boolean = ClipboardFormats.REFERENCE_PREFIX == format.substr(0,ClipboardFormats.REFERENCE_PREFIX.length);
         var isSerialization:Boolean = ClipboardFormats.SERIALIZATION_PREFIX == format.substr(0,ClipboardFormats.SERIALIZATION_PREFIX.length);
         if(isReference)
         {
            return this.getObjectReference(format);
         }
         if(isSerialization)
         {
            return this.getDeserialization(format);
         }
         return undefined;
      }
      
      private function convertFlashFormat(flashFormat:String, data:Object, serializable:Boolean) : Boolean
      {
         var toNative:* = undefined;
         if(isSystemFormat(flashFormat))
         {
            toNative = _fromFlash[flashFormat];
            if(Boolean(toNative))
            {
               toNative(this,data);
               return true;
            }
            return false;
         }
         this.putObjectReference(ClipboardFormats.REFERENCE_PREFIX + flashFormat,data);
         if(serializable)
         {
            this.putSerialization(ClipboardFormats.SERIALIZATION_PREFIX + flashFormat,data);
         }
         return true;
      }
      
      private native function get swfVersion() : int;
      
      private native function setHandlerStoringData(param1:Boolean) : void;
   }
}

