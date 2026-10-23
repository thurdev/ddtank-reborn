package flash.xml
{
   [native(cls="XMLNodeClass",instance="XMLNodeObject",gc="exact",methods="auto")]
   public class XMLNode
   {
      
      public var nodeType:uint;
      
      public var previousSibling:XMLNode;
      
      public var nextSibling:XMLNode;
      
      public var parentNode:XMLNode;
      
      public var firstChild:XMLNode;
      
      public var lastChild:XMLNode;
      
      private var _childNodes:Array;
      
      private var _attributes:Object;
      
      public var nodeName:String;
      
      public var nodeValue:String;
      
      public function XMLNode(type:uint, value:String)
      {
         super();
         this.init(type,value);
      }
      
      private static native function escapeXML(param1:String) : String;
      
      public function get childNodes() : Array
      {
         var child:XMLNode = null;
         if(this._childNodes == null)
         {
            this._childNodes = new Array();
            child = this.firstChild;
            while(child != null)
            {
               this._childNodes.push(child);
               child = child.nextSibling;
            }
         }
         return this._childNodes;
      }
      
      public function get attributes() : Object
      {
         if(this._attributes == null)
         {
            this._attributes = {};
         }
         return this._attributes;
      }
      
      public function set attributes(value:Object) : void
      {
         this._attributes = value;
      }
      
      private function init(type:uint, value:String) : void
      {
         this.nodeType = type;
         if(type == 1)
         {
            this.nodeName = value;
         }
         else
         {
            this.nodeValue = value;
         }
      }
      
      public function hasChildNodes() : Boolean
      {
         return this.firstChild != null;
      }
      
      public function cloneNode(deep:Boolean) : XMLNode
      {
         var name:String = null;
         var child:XMLNode = null;
         var result:XMLNode = new XMLNode(this.nodeType,this.nodeType == XMLNodeType.ELEMENT_NODE ? this.nodeName : this.nodeValue);
         if(this._attributes !== null)
         {
            result.attributes = {};
            for(name in this._attributes)
            {
               result.attributes[name] = this._attributes[name];
            }
         }
         if(deep)
         {
            child = this.firstChild;
            while(child != null)
            {
               result.appendChild(child.cloneNode(true));
               child = child.nextSibling;
            }
         }
         return result;
      }
      
      public function removeNode() : void
      {
         var i:int = 0;
         if(this.parentNode === null)
         {
            return;
         }
         if(this.previousSibling === null)
         {
            this.parentNode.firstChild = this.nextSibling;
         }
         else
         {
            this.previousSibling.nextSibling = this.nextSibling;
         }
         if(this.nextSibling === null)
         {
            this.parentNode.lastChild = this.previousSibling;
         }
         else
         {
            this.nextSibling.previousSibling = this.previousSibling;
         }
         if(this.parentNode._childNodes !== null)
         {
            for(i = 0; i < this.parentNode._childNodes.length; i++)
            {
               if(this.parentNode._childNodes[i] == this)
               {
                  this.parentNode._childNodes.splice(i,1);
                  break;
               }
            }
         }
         this.parentNode = null;
         this.previousSibling = null;
         this.nextSibling = null;
      }
      
      public function insertBefore(node:XMLNode, before:XMLNode) : void
      {
         var i:uint = 0;
         if(before === null)
         {
            return this.appendChild(node);
         }
         if(before.parentNode !== this || node.parentNode === this)
         {
            Error.throwError(Error,2102);
         }
         node.removeNode();
         if(before.previousSibling === null)
         {
            this.firstChild = node;
         }
         else
         {
            before.previousSibling.nextSibling = node;
         }
         node.previousSibling = before.previousSibling;
         node.nextSibling = before;
         before.previousSibling = node;
         node.parentNode = this;
         if(this._childNodes !== null)
         {
            for(i = 0; i < this._childNodes.length; i++)
            {
               if(this._childNodes[i] == before)
               {
                  this._childNodes.splice(i,0,node);
                  return;
               }
            }
            Error.throwError(Error,2102);
            return;
         }
      }
      
      public function appendChild(node:XMLNode) : void
      {
         var x:XMLNode = this;
         while(Boolean(x))
         {
            if(x === node)
            {
               Error.throwError(Error,2103);
            }
            x = x.parentNode;
         }
         if(node.parentNode === this)
         {
            return;
         }
         node.removeNode();
         if(this.lastChild === null)
         {
            this.firstChild = node;
         }
         else
         {
            this.lastChild.nextSibling = node;
         }
         node.previousSibling = this.lastChild;
         node.nextSibling = null;
         node.parentNode = this;
         this.lastChild = node;
         if(this._childNodes !== null)
         {
            this._childNodes.push(node);
         }
      }
      
      public function toString() : String
      {
         var attribute:String = null;
         var node:XMLNode = null;
         var s:String = "";
         if(this.nodeType == XMLNodeType.ELEMENT_NODE)
         {
            if(this.nodeName != null)
            {
               s += "<" + this.nodeName;
            }
            for(attribute in this._attributes)
            {
               s += " " + attribute + "=\"" + escapeXML(String(this._attributes[attribute])) + "\"";
            }
            if(this.nodeName != null)
            {
               if(this.hasChildNodes())
               {
                  s += ">";
               }
               else
               {
                  s += " />";
               }
            }
            if(this.hasChildNodes())
            {
               node = this.firstChild;
               while(node != null)
               {
                  s += node.toString();
                  node = node.nextSibling;
               }
               if(this.nodeName != null)
               {
                  s += "</" + this.nodeName + ">";
               }
            }
         }
         else
         {
            s += escapeXML(this.nodeValue);
         }
         return s;
      }
      
      public function getNamespaceForPrefix(prefix:String) : String
      {
         var name:String = null;
         var newString:String = null;
         for(name in this._attributes)
         {
            if(name.indexOf("xmlns") == 0)
            {
               if(name.charCodeAt(5) == 58)
               {
                  newString = name.substring(6);
                  if(newString == prefix)
                  {
                     return this._attributes[name];
                  }
               }
               else if(prefix.length == 0)
               {
                  return this._attributes[name];
               }
            }
         }
         if(this.parentNode !== null)
         {
            return this.parentNode.getNamespaceForPrefix(prefix);
         }
         return null;
      }
      
      public function getPrefixForNamespace(ns:String) : String
      {
         var name:String = null;
         for(name in this._attributes)
         {
            if(name.indexOf("xmlns") == 0)
            {
               if(this._attributes[name] == ns)
               {
                  if(name.charCodeAt(5) == 58)
                  {
                     return name.substring(6);
                  }
                  return "";
               }
            }
         }
         if(this.parentNode !== null)
         {
            return this.parentNode.getPrefixForNamespace(ns);
         }
         return null;
      }
      
      public function get localName() : String
      {
         if(this.nodeName == null)
         {
            return null;
         }
         var i:int = this.nodeName.indexOf(":");
         if(i != -1)
         {
            return this.nodeName.substring(i + 1);
         }
         return this.nodeName;
      }
      
      public function get prefix() : String
      {
         if(this.nodeName == null)
         {
            return null;
         }
         var i:int = this.nodeName.indexOf(":");
         if(i != -1)
         {
            return this.nodeName.substring(0,i);
         }
         return "";
      }
      
      public function get namespaceURI() : String
      {
         if(this.nodeName == null)
         {
            return null;
         }
         var s:String = String(this.prefix);
         return this.getNamespaceForPrefix(s);
      }
   }
}

