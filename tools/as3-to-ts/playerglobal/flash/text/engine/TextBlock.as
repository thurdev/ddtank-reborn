package flash.text.engine
{
   [native(cls="TextBlockClass",instance="TextBlockObject",methods="auto")]
   [Version("10")]
   public final class TextBlock
   {
      
      public var userData:*;
      
      public function TextBlock(content:ContentElement = null, tabStops:Vector.<TabStop> = null, textJustifier:TextJustifier = null, lineRotation:String = "rotate0", baselineZero:String = "roman", bidiLevel:int = 0, applyNonLinearFontScaling:Boolean = true, baselineFontDescription:FontDescription = null, baselineFontSize:Number = 12)
      {
         super();
         if(Boolean(content))
         {
            this.content = content;
         }
         if(Boolean(tabStops))
         {
            this.tabStops = tabStops;
         }
         this.textJustifier = Boolean(textJustifier) ? textJustifier : TextJustifier.getJustifierForLocale("en");
         this.lineRotation = lineRotation;
         if(Boolean(baselineZero))
         {
            this.baselineZero = baselineZero;
         }
         this.bidiLevel = bidiLevel;
         this.applyNonLinearFontScaling = applyNonLinearFontScaling;
         if(Boolean(baselineFontDescription))
         {
            this.baselineFontDescription = baselineFontDescription;
            this.baselineFontSize = baselineFontSize;
         }
      }
      
      public native function get applyNonLinearFontScaling() : Boolean;
      
      public native function set applyNonLinearFontScaling(param1:Boolean) : void;
      
      public native function get baselineFontDescription() : FontDescription;
      
      public native function set baselineFontDescription(param1:FontDescription) : void;
      
      public native function get baselineFontSize() : Number;
      
      public native function set baselineFontSize(param1:Number) : void;
      
      public native function get baselineZero() : String;
      
      public native function set baselineZero(param1:String) : void;
      
      public native function get content() : ContentElement;
      
      public native function set content(param1:ContentElement) : void;
      
      public native function get bidiLevel() : int;
      
      public native function set bidiLevel(param1:int) : void;
      
      public native function get firstInvalidLine() : TextLine;
      
      public native function get firstLine() : TextLine;
      
      public native function get lastLine() : TextLine;
      
      public function get textJustifier() : TextJustifier
      {
         return this.getTextJustifier().clone();
      }
      
      public function set textJustifier(value:TextJustifier) : void
      {
         var myJustifier:TextJustifier = Boolean(value) ? value.clone() : null;
         this.setTextJustifier(myJustifier);
      }
      
      private native function getTextJustifier() : TextJustifier;
      
      private native function setTextJustifier(param1:TextJustifier) : void;
      
      public native function get textLineCreationResult() : String;
      
      public native function get lineRotation() : String;
      
      public native function set lineRotation(param1:String) : void;
      
      public function get tabStops() : Vector.<TabStop>
      {
         var i:uint = 0;
         var t:TabStop = null;
         var newT:TabStop = null;
         var myTabs:Vector.<TabStop> = this.getTabStops();
         var retTabs:Vector.<TabStop> = null;
         if(Boolean(myTabs))
         {
            retTabs = new Vector.<TabStop>();
            for(i = 0; i < myTabs.length; i++)
            {
               t = myTabs[i];
               newT = new TabStop(t.alignment,t.position,t.decimalAlignmentToken);
               retTabs.push(t);
            }
         }
         return retTabs;
      }
      
      public function set tabStops(value:Vector.<TabStop>) : void
      {
         var i:uint = 0;
         var t:TabStop = null;
         var newT:TabStop = null;
         var myTabs:Vector.<TabStop> = null;
         if(Boolean(value))
         {
            myTabs = new Vector.<TabStop>();
            for(i = 0; i < value.length; i++)
            {
               t = value[i];
               newT = new TabStop(t.alignment,t.position,t.decimalAlignmentToken);
               myTabs.push(t);
            }
         }
         this.setTabStops(myTabs);
      }
      
      private native function getTabStops() : Vector.<TabStop>;
      
      private native function setTabStops(param1:Vector.<TabStop>) : void;
      
      public native function findNextAtomBoundary(param1:int) : int;
      
      public native function findPreviousAtomBoundary(param1:int) : int;
      
      public native function findNextWordBoundary(param1:int) : int;
      
      public native function findPreviousWordBoundary(param1:int) : int;
      
      public native function getTextLineAtCharIndex(param1:int) : TextLine;
      
      public function createTextLine(previousLine:TextLine = null, width:Number = 1000000, lineOffset:Number = 0, fitSomething:Boolean = false) : TextLine
      {
         if(this.content == null)
         {
            return null;
         }
         if(previousLine != null && previousLine.validity != TextLineValidity.VALID)
         {
            Error.throwError(ArgumentError,2004,"previousLine");
         }
         if(previousLine != null && previousLine.textBlock != this)
         {
            Error.throwError(ArgumentError,2004,"previousLine");
         }
         if(width < 0 && fitSomething == false || width > TextLine.MAX_LINE_WIDTH)
         {
            Error.throwError(ArgumentError,2004,"width");
         }
         if(width == 0 && fitSomething == false)
         {
            return null;
         }
         return this.DoCreateTextLine(previousLine,width,lineOffset,fitSomething,null);
      }
      
      [Version("10.1")]
      public function recreateTextLine(textLine:TextLine, previousLine:TextLine = null, width:Number = 1000000, lineOffset:Number = 0, fitSomething:Boolean = false) : TextLine
      {
         if(textLine == null)
         {
            Error.throwError(ArgumentError,2004,"textLine");
         }
         if(previousLine != null && previousLine.validity != TextLineValidity.VALID)
         {
            Error.throwError(ArgumentError,2004,"previousLine");
         }
         if(previousLine != null && previousLine.textBlock != this)
         {
            Error.throwError(ArgumentError,2004,"previousLine");
         }
         if(previousLine != null && previousLine == textLine)
         {
            Error.throwError(ArgumentError,2004,"previousLine");
         }
         if(width < 0 && fitSomething == false || width > TextLine.MAX_LINE_WIDTH)
         {
            Error.throwError(ArgumentError,2004,"width");
         }
         textLine.userData = null;
         return this.DoCreateTextLine(previousLine,width,lineOffset,fitSomething,textLine);
      }
      
      private native function DoCreateTextLine(param1:TextLine, param2:Number, param3:Number = 0, param4:Boolean = false, param5:TextLine = null) : TextLine;
      
      [Version("10.1")]
      public native function releaseLineCreationData() : void;
      
      public native function releaseLines(param1:TextLine, param2:TextLine) : void;
      
      public native function dump() : String;
   }
}

