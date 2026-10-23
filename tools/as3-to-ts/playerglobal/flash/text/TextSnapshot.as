package flash.text
{
   [native(cls="TextSnapshotClass",instance="TextSnapshotObject",methods="auto",construct="native")]
   public class TextSnapshot
   {
      
      public function TextSnapshot()
      {
         super();
      }
      
      public native function findText(param1:int, param2:String, param3:Boolean) : int;
      
      public native function get charCount() : int;
      
      public native function getSelected(param1:int, param2:int) : Boolean;
      
      public native function getSelectedText(param1:Boolean = false) : String;
      
      public native function getText(param1:int, param2:int, param3:Boolean = false) : String;
      
      public native function getTextRunInfo(param1:int, param2:int) : Array;
      
      public native function hitTestTextNearPos(param1:Number, param2:Number, param3:Number = 0) : Number;
      
      public native function setSelectColor(param1:uint = 16776960) : void;
      
      public native function setSelected(param1:int, param2:int, param3:Boolean) : void;
   }
}

