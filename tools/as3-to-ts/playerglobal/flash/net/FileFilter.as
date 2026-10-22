package flash.net
{
   [native(cls="FileFilterClass",instance="FileFilterObject",methods="auto")]
   public final class FileFilter
   {
      
      public function FileFilter(description:String, extension:String, macType:String = null)
      {
         super();
         this.description = description;
         this.extension = extension;
         this.macType = macType;
      }
      
      public native function get description() : String;
      
      public native function set description(param1:String) : void;
      
      public native function get extension() : String;
      
      public native function set extension(param1:String) : void;
      
      public native function get macType() : String;
      
      public native function set macType(param1:String) : void;
   }
}

