package flash.xml
{
   [native(cls="XMLTagClass",instance="XMLTagObject",methods="auto")]
   internal final class XMLTag
   {
      
      public function XMLTag()
      {
         super();
      }
      
      public native function get type() : uint;
      
      public native function set type(param1:uint) : void;
      
      public native function get empty() : Boolean;
      
      public native function set empty(param1:Boolean) : void;
      
      public native function get value() : String;
      
      public native function set value(param1:String) : void;
      
      public native function get attrs() : Object;
      
      public native function set attrs(param1:Object) : void;
   }
}

