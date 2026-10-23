package flash.text.engine
{
   import flash.display.DisplayObject;
   import flash.display.DisplayObjectContainer;
   import flash.errors.*;
   import flash.events.EventDispatcher;
   import flash.geom.Rectangle;
   import flash.ui.ContextMenu;
   
   [native(cls="TextLineClass",instance="TextLineObject",methods="auto",construct="none")]
   [Version("10")]
   public final class TextLine extends DisplayObjectContainer
   {
      
      public static const MAX_LINE_WIDTH:int = 1000000;
      
      public var userData:*;
      
      public function TextLine()
      {
         super();
      }
      
      override public function set focusRect(focusRect:Object) : void
      {
         Error.throwError(IllegalOperationError,2181);
      }
      
      override public function set tabChildren(enable:Boolean) : void
      {
         Error.throwError(IllegalOperationError,2181);
      }
      
      override public function set tabEnabled(enabled:Boolean) : void
      {
         Error.throwError(IllegalOperationError,2181);
      }
      
      override public function set tabIndex(index:int) : void
      {
         Error.throwError(IllegalOperationError,2181);
      }
      
      public native function get textBlock() : TextBlock;
      
      public native function get hasGraphicElement() : Boolean;
      
      [Version("10.1")]
      public native function get hasTabs() : Boolean;
      
      public native function get nextLine() : TextLine;
      
      public native function get previousLine() : TextLine;
      
      public native function get ascent() : Number;
      
      public native function get descent() : Number;
      
      public native function get textHeight() : Number;
      
      public native function get textWidth() : Number;
      
      [API("670")]
      public native function get totalAscent() : Number;
      
      [API("670")]
      public native function get totalDescent() : Number;
      
      [API("670")]
      public native function get totalHeight() : Number;
      
      public native function get textBlockBeginIndex() : int;
      
      public native function get rawTextLength() : int;
      
      public native function get specifiedWidth() : Number;
      
      public native function get unjustifiedTextWidth() : Number;
      
      public native function get validity() : String;
      
      public native function set validity(param1:String) : void;
      
      public native function get atomCount() : int;
      
      public native function get mirrorRegions() : Vector.<TextLineMirrorRegion>;
      
      public function getMirrorRegion(mirror:EventDispatcher) : TextLineMirrorRegion
      {
         var region:TextLineMirrorRegion = null;
         var mr:Vector.<TextLineMirrorRegion> = this.mirrorRegions;
         for(var i:int = 0; i < mr.length; i++)
         {
            region = mr[i];
            if(region.mirror == mirror)
            {
               return region;
            }
         }
         return null;
      }
      
      [Deprecated("Now does nothing",since="Flash Player 10.1")]
      public function flushAtomData() : void
      {
      }
      
      public native function getAtomIndexAtPoint(param1:Number, param2:Number) : int;
      
      public native function getAtomIndexAtCharIndex(param1:int) : int;
      
      public native function getAtomBounds(param1:int) : Rectangle;
      
      public native function getAtomBidiLevel(param1:int) : int;
      
      public native function getAtomTextRotation(param1:int) : String;
      
      public native function getAtomTextBlockBeginIndex(param1:int) : int;
      
      public native function getAtomTextBlockEndIndex(param1:int) : int;
      
      public native function getAtomCenter(param1:int) : Number;
      
      public native function getAtomWordBoundaryOnLeft(param1:int) : Boolean;
      
      public native function getAtomGraphic(param1:int) : DisplayObject;
      
      public native function getBaselinePosition(param1:String) : Number;
      
      public native function dump() : String;
      
      [Exclude(name="tabIndex",kind="property")]
      [Exclude(name="tabEnabled",kind="property")]
      [Exclude(name="tabChildren",kind="property")]
      [Exclude(name="focusRect",kind="property")]
      [Exclude(name="contextMenu",kind="property")]
      override public function set contextMenu(value:ContextMenu) : void
      {
         Error.throwError(IllegalOperationError,2181);
      }
   }
}

