package flash.xml
{
   public final class XMLNodeType
   {
      
      public static const ELEMENT_NODE:uint = 1;
      
      public static const TEXT_NODE:uint = 3;
      
      [Inspectable(environment="none")]
      public static const CDATA_NODE:uint = 4;
      
      [Inspectable(environment="none")]
      public static const PROCESSING_INSTRUCTION_NODE:uint = 7;
      
      [Inspectable(environment="none")]
      public static const COMMENT_NODE:uint = 8;
      
      [Inspectable(environment="none")]
      public static const DOCUMENT_TYPE_NODE:uint = 10;
      
      [Inspectable(environment="none")]
      public static const XML_DECLARATION:uint = 13;
      
      public function XMLNodeType()
      {
         super();
      }
   }
}

