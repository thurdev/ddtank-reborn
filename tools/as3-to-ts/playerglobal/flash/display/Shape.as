package flash.display
{
   [native(cls="ShapeClass",gc="exact",instance="ShapeObject",methods="auto")]
   public class Shape extends DisplayObject
   {
      
      public function Shape()
      {
         super();
      }
      
      public native function get graphics() : Graphics;
   }
}

