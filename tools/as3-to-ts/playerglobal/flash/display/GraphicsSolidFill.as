package flash.display
{
   [Version("10")]
   public final class GraphicsSolidFill implements IGraphicsFill, IGraphicsData
   {
      
      public var color:uint = 0;
      
      public var alpha:Number = 1;
      
      public function GraphicsSolidFill(color:uint = 0, alpha:Number = 1)
      {
         super();
         this.color = color;
         this.alpha = alpha;
      }
   }
}

