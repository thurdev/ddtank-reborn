package flash.xml
{
   public class XMLDocument extends XMLNode
   {
      
      private static const kNoError:int = 0;
      
      private static const kEndOfDocument:int = -1;
      
      private static const kUnterminatedCdata:int = -2;
      
      private static const kUnterminatedXmlDeclaration:int = -3;
      
      private static const kUnterminatedDoctypeDeclaration:int = -4;
      
      private static const kUnterminatedComment:int = -5;
      
      private static const kMalformedElement:int = -6;
      
      private static const kOutOfMemory:int = -7;
      
      private static const kUnterminatedAttributeValue:int = -8;
      
      private static const kUnterminatedElement:int = -9;
      
      private static const kElementNeverBegun:int = -10;
      
      public var xmlDecl:Object = null;
      
      public var docTypeDecl:Object = null;
      
      public var idMap:Object = {};
      
      public var ignoreWhite:Boolean = false;
      
      public function XMLDocument(source:String = null)
      {
         super(1,"");
         nodeName = null;
         if(source != null)
         {
            this.parseXML(source);
         }
      }
      
      public function createElement(name:String) : XMLNode
      {
         return new XMLNode(1,name);
      }
      
      public function createTextNode(text:String) : XMLNode
      {
         return new XMLNode(3,text);
      }
      
      override public function toString() : String
      {
         var node:XMLNode = null;
         var s:String = "";
         if(this.xmlDecl != null)
         {
            s += this.xmlDecl;
         }
         if(this.docTypeDecl != null)
         {
            s += this.docTypeDecl;
         }
         if(hasChildNodes())
         {
            node = firstChild;
            while(node != null)
            {
               s += node.toString();
               node = node.nextSibling;
            }
         }
         else
         {
            s += "<>";
         }
         return s;
      }
      
      public function parseXML(source:String) : void
      {
         var result:int = 0;
         var tagType:int = 0;
         var tagValue:String = null;
         var element:XMLNode = null;
         var o:Object = null;
         firstChild = null;
         lastChild = null;
         childNodes.splice(0);
         attributes = null;
         this.xmlDecl = null;
         this.docTypeDecl = null;
         var parser:XMLParser = new XMLParser();
         parser.startParse(source,this.ignoreWhite);
         var parent:XMLNode = this;
         var tag:XMLTag = new XMLTag();
         var localStatus:int = 0;
         while(true)
         {
            result = parser.getNext(tag);
            if(result != kNoError)
            {
               break;
            }
            tagType = int(tag.type);
            tagValue = tag.value;
            if(tagType === 1)
            {
               element = new XMLNode(1,tagValue);
               if(tag.attrs !== null)
               {
                  o = tag.attrs;
                  if("id" in o)
                  {
                     this.idMap[o.id] = element;
                  }
                  element.attributes = o;
               }
               if(tagValue.charCodeAt(0) == 47)
               {
                  if(tagValue.substr(1) === parent.nodeName)
                  {
                     parent = parent.parentNode;
                  }
                  else
                  {
                     localStatus = int(kElementNeverBegun);
                  }
               }
               else
               {
                  parent.appendChild(element);
                  if(!tag.empty)
                  {
                     parent = element;
                  }
               }
               continue;
            }
            if(tagType === 3 || tagType === 4)
            {
               element = new XMLNode(3,tagValue);
               parent.appendChild(element);
               continue;
            }
            switch(tagType)
            {
               case 13:
                  if(this.xmlDecl == null)
                  {
                     this.xmlDecl = "";
                  }
                  this.xmlDecl += "<?" + tagValue + "?>";
                  break;
               case 10:
                  this.docTypeDecl = tagValue;
            }
         }
         if(result == kEndOfDocument)
         {
            result = int(kNoError);
         }
         else
         {
            localStatus = result;
         }
         if(parent != this && result == kNoError)
         {
            localStatus = int(kUnterminatedElement);
         }
         if(localStatus != kNoError)
         {
            nodeType = 1;
            nextSibling = null;
            previousSibling = null;
            parentNode = null;
            firstChild = null;
            lastChild = null;
            childNodes.splice(0);
            attributes = null;
            nodeName = "";
            nodeValue = null;
            switch(localStatus)
            {
               case kUnterminatedCdata:
                  Error.throwError(Error,1091);
                  break;
               case kUnterminatedXmlDeclaration:
                  Error.throwError(Error,1092);
                  break;
               case kUnterminatedDoctypeDeclaration:
                  Error.throwError(Error,1093);
                  break;
               case kUnterminatedComment:
                  Error.throwError(Error,1094);
                  break;
               case kMalformedElement:
                  Error.throwError(Error,1090);
                  break;
               case kOutOfMemory:
                  Error.throwError(Error,1000);
                  break;
               case kUnterminatedAttributeValue:
                  Error.throwError(Error,1095);
                  break;
               case kUnterminatedElement:
                  Error.throwError(Error,1096);
                  break;
               case kElementNeverBegun:
                  Error.throwError(Error,2070);
                  break;
               default:
                  Error.throwError(Error,2071);
            }
         }
      }
   }
}

