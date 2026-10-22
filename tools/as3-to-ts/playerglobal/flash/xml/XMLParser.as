package flash.xml
{
   [native(cls="XMLParserClass",instance="XMLParserObject",methods="auto")]
   internal final class XMLParser
   {
      
      public function XMLParser()
      {
         super();
      }
      
      public native function startParse(param1:String, param2:Boolean) : void;
      
      public native function getNext(param1:XMLTag) : int;
   }
}

