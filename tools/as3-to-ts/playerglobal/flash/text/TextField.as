package flash.text
{
   import flash.display.DisplayObject;
   import flash.display.InteractiveObject;
   import flash.geom.Rectangle;
   
   [native(cls="TextFieldClass",gc="exact",instance="TextFieldObject",methods="auto")]
   [Event(name="textInteractionModeChange",type="flash.events.Event")]
   [Event(name="textInput",type="flash.events.TextEvent")]
   [Event(name="scroll",type="flash.events.Event")]
   [Event(name="link",type="flash.events.TextEvent")]
   [Event(name="change",type="flash.events.Event")]
   public class TextField extends InteractiveObject
   {
      
      private static var richTextFields:Array = ["font","size","color","bold","italic","underline","url","target","align","leftMargin","rightMargin","indent","leading","blockIndent","kerning","letterSpacing","display"];
      
      public function TextField()
      {
         super();
      }
      
      [Version("10")]
      public static native function isFontCompatible(param1:String, param2:String) : Boolean;
      
      public native function get alwaysShowSelection() : Boolean;
      
      public native function set alwaysShowSelection(param1:Boolean) : void;
      
      public native function get antiAliasType() : String;
      
      public native function set antiAliasType(param1:String) : void;
      
      public native function get autoSize() : String;
      
      public native function set autoSize(param1:String) : void;
      
      public native function get background() : Boolean;
      
      public native function set background(param1:Boolean) : void;
      
      public native function get backgroundColor() : uint;
      
      public native function set backgroundColor(param1:uint) : void;
      
      public native function get border() : Boolean;
      
      public native function set border(param1:Boolean) : void;
      
      public native function get borderColor() : uint;
      
      public native function set borderColor(param1:uint) : void;
      
      public native function get bottomScrollV() : int;
      
      public native function get caretIndex() : int;
      
      public native function get condenseWhite() : Boolean;
      
      public native function set condenseWhite(param1:Boolean) : void;
      
      public native function get defaultTextFormat() : TextFormat;
      
      public native function set defaultTextFormat(param1:TextFormat) : void;
      
      public native function get embedFonts() : Boolean;
      
      public native function set embedFonts(param1:Boolean) : void;
      
      public native function get gridFitType() : String;
      
      public native function set gridFitType(param1:String) : void;
      
      public native function get htmlText() : String;
      
      public native function set htmlText(param1:String) : void;
      
      public native function get length() : int;
      
      [API("670")]
      public native function get textInteractionMode() : String;
      
      public native function get maxChars() : int;
      
      public native function set maxChars(param1:int) : void;
      
      public native function get maxScrollH() : int;
      
      public native function get maxScrollV() : int;
      
      public native function get mouseWheelEnabled() : Boolean;
      
      public native function set mouseWheelEnabled(param1:Boolean) : void;
      
      public native function get multiline() : Boolean;
      
      public native function set multiline(param1:Boolean) : void;
      
      public native function get numLines() : int;
      
      public native function get displayAsPassword() : Boolean;
      
      public native function set displayAsPassword(param1:Boolean) : void;
      
      public native function get restrict() : String;
      
      public native function set restrict(param1:String) : void;
      
      public native function get scrollH() : int;
      
      public native function set scrollH(param1:int) : void;
      
      public native function get scrollV() : int;
      
      public native function set scrollV(param1:int) : void;
      
      public native function get selectable() : Boolean;
      
      public native function set selectable(param1:Boolean) : void;
      
      [Inspectable(environment="none")]
      public function get selectedText() : String
      {
         return this.text.substring(this.selectionBeginIndex,this.selectionEndIndex);
      }
      
      public native function get selectionBeginIndex() : int;
      
      public native function get selectionEndIndex() : int;
      
      public native function get sharpness() : Number;
      
      public native function set sharpness(param1:Number) : void;
      
      public native function get styleSheet() : StyleSheet;
      
      public native function set styleSheet(param1:StyleSheet) : void;
      
      public native function get text() : String;
      
      public native function set text(param1:String) : void;
      
      public native function get textColor() : uint;
      
      public native function set textColor(param1:uint) : void;
      
      public native function get textHeight() : Number;
      
      public native function get textWidth() : Number;
      
      public native function get thickness() : Number;
      
      public native function set thickness(param1:Number) : void;
      
      public native function get type() : String;
      
      public native function set type(param1:String) : void;
      
      public native function get wordWrap() : Boolean;
      
      public native function set wordWrap(param1:Boolean) : void;
      
      public function appendText(newText:String) : void
      {
         this.replaceText(this.text.length,this.text.length,newText);
      }
      
      [cppcall]
      internal function copyRichText() : String
      {
         return this.getXMLText(this.selectionBeginIndex,this.selectionEndIndex);
      }
      
      public native function getCharBoundaries(param1:int) : Rectangle;
      
      public native function getCharIndexAtPoint(param1:Number, param2:Number) : int;
      
      private native function getCharIndexNearestPoint(param1:Number, param2:Number) : int;
      
      public native function getFirstCharInParagraph(param1:int) : int;
      
      public native function getLineIndexAtPoint(param1:Number, param2:Number) : int;
      
      public native function getLineIndexOfChar(param1:int) : int;
      
      public native function getLineLength(param1:int) : int;
      
      public native function getLineMetrics(param1:int) : TextLineMetrics;
      
      public native function getLineOffset(param1:int) : int;
      
      public native function getLineText(param1:int) : String;
      
      public native function getParagraphLength(param1:int) : int;
      
      public native function getTextFormat(param1:int = -1, param2:int = -1) : TextFormat;
      
      [Inspectable(environment="none")]
      public native function getTextRuns(param1:int = 0, param2:int = 2147483647) : Array;
      
      [Inspectable(environment="none")]
      public native function getRawText() : String;
      
      [Inspectable(environment="none")]
      public function getXMLText(beginIndex:int = 0, endIndex:int = 2147483647) : String
      {
         var run:TextRun = null;
         var format:TextFormat = null;
         var text:String = null;
         var runXML:XML = null;
         var j:uint = 0;
         var name:String = null;
         var value:* = undefined;
         var runs:Array = this.getTextRuns(beginIndex,endIndex);
         var entireText:String = this.getRawText();
         var result:XML = <flashrichtext version="1"/>;
         for(var i:uint = 0; i < runs.length; i++)
         {
            run = runs[i];
            format = run.textFormat;
            text = entireText.substring(run.beginIndex,run.endIndex);
            text = "(" + text + ")";
            runXML = <textformat>{text}</textformat>;
            for(j = 0; j < richTextFields.length; j++)
            {
               name = richTextFields[j];
               value = format[name];
               if(value != null)
               {
                  runXML["@" + name] = value;
               }
            }
            result.flashrichtext += runXML;
         }
         return result.toXMLString();
      }
      
      [Inspectable(environment="none")]
      public function insertXMLText(beginIndex:int, endIndex:int, richText:String, pasting:Boolean = false) : void
      {
         var run:XML = null;
         var temp:int = 0;
         var attributes:XMLList = null;
         var format:TextFormat = null;
         var attribute:XML = null;
         var text:String = null;
         var name:String = null;
         var value:String = null;
         var spaceAvail:int = 0;
         var richTextXML:XML = XML(richText);
         if(richTextXML.@version != "1")
         {
            Error.throwError(Error,2138);
         }
         if(beginIndex > endIndex)
         {
            temp = beginIndex;
            beginIndex = endIndex;
            endIndex = temp;
         }
         var first:Boolean = true;
         for each(run in richTextXML..textformat)
         {
            attributes = run.attributes();
            format = new TextFormat();
            for each(attribute in attributes)
            {
               name = attribute.name().localName;
               value = String(attribute);
               if(name == "bold" || name == "italic" || name == "underline")
               {
                  format[name] = value == "true";
               }
               else
               {
                  format[name] = value;
               }
            }
            text = String(run.children());
            text = text.substring(1,text.length - 1);
            if(this.maxChars > 0 && pasting == true)
            {
               spaceAvail = this.maxChars - this.length + (endIndex - beginIndex);
               if(spaceAvail < text.length)
               {
                  if(spaceAvail <= 0)
                  {
                     return;
                  }
                  text = text.substring(0,spaceAvail);
               }
            }
            this.replaceText(beginIndex,endIndex,text);
            this.setTextFormat(format,beginIndex,beginIndex + text.length);
            beginIndex += text.length;
            endIndex = beginIndex;
            if(pasting)
            {
               this.setSelection(beginIndex,endIndex);
            }
            first = false;
         }
         if(first)
         {
            this.replaceText(beginIndex,endIndex,"");
         }
      }
      
      [cppcall]
      internal function pasteRichText(richText:String) : Boolean
      {
         if(richText == null)
         {
            Error.throwError(TypeError,2007,"richText");
         }
         try
         {
            this.insertXMLText(this.selectionBeginIndex,this.selectionEndIndex,richText,true);
         }
         catch(e:Error)
         {
            return false;
         }
         return true;
      }
      
      public native function replaceSelectedText(param1:String) : void;
      
      public native function replaceText(param1:int, param2:int, param3:String) : void;
      
      public native function setSelection(param1:int, param2:int) : void;
      
      public native function setTextFormat(param1:TextFormat, param2:int = -1, param3:int = -1) : void;
      
      public native function getImageReference(param1:String) : DisplayObject;
      
      public native function get useRichTextClipboard() : Boolean;
      
      public native function set useRichTextClipboard(param1:Boolean) : void;
   }
}

