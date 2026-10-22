package
{
   use namespace AS3;
   
   [native(cls="XMLListClass",gc="exact",instance="XMLListObject",methods="auto",construct="override")]
   public final dynamic class XMLList
   {
      
      public static const length:* = 1;
      
      prototype.valueOf = Object.prototype.valueOf;
      prototype.hasOwnProperty = function(P:* = undefined):Boolean
      {
         if(this === prototype)
         {
            return this.hasOwnProperty(P);
         }
         var x:XMLList = this;
         return x.hasOwnProperty(P);
      };
      prototype.propertyIsEnumerable = function(P:* = undefined):Boolean
      {
         if(this === prototype)
         {
            return this.propertyIsEnumerable(P);
         }
         var x:XMLList = this;
         return x.propertyIsEnumerable(P);
      };
      prototype.toString = function():String
      {
         if(this === prototype)
         {
            return "";
         }
         var x:XMLList = this;
         return x.toString();
      };
      prototype.addNamespace = function(ns:*):XML
      {
         var x:XMLList = this;
         return x.addNamespace(ns);
      };
      prototype.appendChild = function(child:*):XML
      {
         var x:XMLList = this;
         return x.appendChild(child);
      };
      prototype.attribute = function(arg:*):XMLList
      {
         var x:XMLList = this;
         return x.attribute(arg);
      };
      prototype.attributes = function():XMLList
      {
         var x:XMLList = this;
         return x.attributes();
      };
      prototype.child = function(propertyName:*):XMLList
      {
         var x:XMLList = this;
         return x.child(propertyName);
      };
      prototype.childIndex = function():int
      {
         var x:XMLList = this;
         return x.childIndex();
      };
      prototype.children = function():XMLList
      {
         var x:XMLList = this;
         return x.children();
      };
      prototype.comments = function():XMLList
      {
         var x:XMLList = this;
         return x.comments();
      };
      prototype.contains = function(value:*):Boolean
      {
         var x:XMLList = this;
         return x.contains(value);
      };
      prototype.copy = function():XMLList
      {
         var x:XMLList = this;
         return x.copy();
      };
      prototype.descendants = function(name:* = "*"):XMLList
      {
         var x:XMLList = this;
         return x.descendants(name);
      };
      prototype.elements = function(name:* = "*"):XMLList
      {
         var x:XMLList = this;
         return x.elements(name);
      };
      prototype.hasComplexContent = function():Boolean
      {
         var x:XMLList = this;
         return x.hasComplexContent();
      };
      prototype.hasSimpleContent = function():Boolean
      {
         var x:XMLList = this;
         return x.hasSimpleContent();
      };
      prototype.inScopeNamespaces = function():Array
      {
         var x:XMLList = this;
         return x.inScopeNamespaces();
      };
      prototype.insertChildAfter = function(child1:*, child2:*):*
      {
         var x:XMLList = this;
         return x.insertChildAfter(child1,child2);
      };
      prototype.insertChildBefore = function(child1:*, child2:*):*
      {
         var x:XMLList = this;
         return x.insertChildBefore(child1,child2);
      };
      prototype.length = function():int
      {
         var x:XMLList = this;
         return x.length();
      };
      prototype.localName = function():Object
      {
         var x:XMLList = this;
         return x.localName();
      };
      prototype.name = function():Object
      {
         var x:XMLList = this;
         return x.name();
      };
      prototype.namespace = function(prefix:* = null):*
      {
         var x:XMLList = this;
         return x.namespace.apply(x,arguments);
      };
      prototype.namespaceDeclarations = function():Array
      {
         var x:XMLList = this;
         return x.namespaceDeclarations();
      };
      prototype.nodeKind = function():String
      {
         var x:XMLList = this;
         return x.nodeKind();
      };
      prototype.normalize = function():XMLList
      {
         var x:XMLList = this;
         return x.normalize();
      };
      prototype.parent = function():*
      {
         var x:XMLList = this;
         return x.parent();
      };
      prototype.processingInstructions = function(name:* = "*"):XMLList
      {
         var x:XMLList = this;
         return x.processingInstructions(name);
      };
      prototype.prependChild = function(value:*):XML
      {
         var x:XMLList = this;
         return x.prependChild(value);
      };
      prototype.removeNamespace = function(ns:*):XML
      {
         var x:XMLList = this;
         return x.removeNamespace(ns);
      };
      prototype.replace = function(propertyName:*, value:*):XML
      {
         var x:XMLList = this;
         return x.replace(propertyName,value);
      };
      prototype.setChildren = function(value:*):XML
      {
         var x:XMLList = this;
         return x.setChildren(value);
      };
      prototype.setLocalName = function(name:*):void
      {
         var x:XMLList = this;
         x.setLocalName(name);
      };
      prototype.setName = function(name:*):void
      {
         var x:XMLList = this;
         x.setName(name);
      };
      prototype.setNamespace = function(ns:*):void
      {
         var x:XMLList = this;
         x.setNamespace(ns);
      };
      prototype.text = function():XMLList
      {
         var x:XMLList = this;
         return x.text();
      };
      prototype.toXMLString = function():String
      {
         var x:XMLList = this;
         return x.toXMLString();
      };
      prototype.toJSON = function(k:String):*
      {
         return "XMLList";
      };
      _dontEnumPrototype(prototype);
      
      public function XMLList(value:* = undefined)
      {
         super();
      }
      
      AS3 native function toString() : String;
      
      AS3 function valueOf() : XMLList
      {
         return this;
      }
      
      override AS3 native function hasOwnProperty(param1:* = undefined) : Boolean;
      
      override AS3 native function propertyIsEnumerable(param1:* = undefined) : Boolean;
      
      AS3 native function attribute(param1:*) : XMLList;
      
      AS3 native function attributes() : XMLList;
      
      AS3 native function child(param1:*) : XMLList;
      
      AS3 native function children() : XMLList;
      
      AS3 native function comments() : XMLList;
      
      AS3 native function contains(param1:*) : Boolean;
      
      AS3 native function copy() : XMLList;
      
      AS3 native function descendants(param1:* = "*") : XMLList;
      
      AS3 native function elements(param1:* = "*") : XMLList;
      
      AS3 native function hasComplexContent() : Boolean;
      
      AS3 native function hasSimpleContent() : Boolean;
      
      AS3 native function length() : int;
      
      AS3 native function name() : Object;
      
      AS3 native function normalize() : XMLList;
      
      AS3 native function parent() : *;
      
      AS3 native function processingInstructions(param1:* = "*") : XMLList;
      
      AS3 native function text() : XMLList;
      
      AS3 native function toXMLString() : String;
      
      AS3 native function addNamespace(param1:*) : XML;
      
      AS3 native function appendChild(param1:*) : XML;
      
      AS3 native function childIndex() : int;
      
      AS3 native function inScopeNamespaces() : Array;
      
      AS3 native function insertChildAfter(param1:*, param2:*) : *;
      
      AS3 native function insertChildBefore(param1:*, param2:*) : *;
      
      AS3 native function nodeKind() : String;
      
      private native function _namespace(param1:*, param2:int) : *;
      
      AS3 function namespace(prefix:* = null) : *
      {
         return Boolean(arguments.length) ? this._namespace(prefix,1) : this._namespace(null,0);
      }
      
      AS3 native function localName() : Object;
      
      AS3 native function namespaceDeclarations() : Array;
      
      AS3 native function prependChild(param1:*) : XML;
      
      AS3 native function removeNamespace(param1:*) : XML;
      
      AS3 native function replace(param1:*, param2:*) : XML;
      
      AS3 native function setChildren(param1:*) : XML;
      
      AS3 native function setLocalName(param1:*) : void;
      
      AS3 native function setName(param1:*) : void;
      
      AS3 native function setNamespace(param1:*) : void;
      
      AS3 function toJSON(k:String) : *
      {
         return this.toJSON(k);
      }
   }
}

