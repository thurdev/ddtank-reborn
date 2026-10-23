package flash.display
{
   import flash.geom.Matrix;
   
   [native(cls="GraphicsClass",gc="exact",instance="GraphicsObject",methods="auto",construct="native")]
   public final class Graphics
   {
      
      public function Graphics()
      {
         super();
      }
      
      public native function clear() : void;
      
      public native function beginFill(param1:uint, param2:Number = 1) : void;
      
      public native function beginGradientFill(param1:String, param2:Array, param3:Array, param4:Array, param5:Matrix = null, param6:String = "pad", param7:String = "rgb", param8:Number = 0) : void;
      
      public native function beginBitmapFill(param1:BitmapData, param2:Matrix = null, param3:Boolean = true, param4:Boolean = false) : void;
      
      [Version("10")]
      public native function beginShaderFill(param1:Shader, param2:Matrix = null) : void;
      
      public native function lineGradientStyle(param1:String, param2:Array, param3:Array, param4:Array, param5:Matrix = null, param6:String = "pad", param7:String = "rgb", param8:Number = 0) : void;
      
      public native function lineStyle(param1:Number = undefined, param2:uint = 0, param3:Number = 1, param4:Boolean = false, param5:String = "normal", param6:String = null, param7:String = null, param8:Number = 3) : void;
      
      public native function drawRect(param1:Number, param2:Number, param3:Number, param4:Number) : void;
      
      public native function drawRoundRect(param1:Number, param2:Number, param3:Number, param4:Number, param5:Number, param6:Number = undefined) : void;
      
      [Inspectable(environment="none")]
      public native function drawRoundRectComplex(param1:Number, param2:Number, param3:Number, param4:Number, param5:Number, param6:Number, param7:Number, param8:Number) : void;
      
      public function drawCircle(x:Number, y:Number, radius:Number) : void
      {
         this.drawRoundRect(x - radius,y - radius,radius * 2,radius * 2,radius * 2,radius * 2);
      }
      
      public function drawEllipse(x:Number, y:Number, width:Number, height:Number) : void
      {
         this.drawRoundRect(x,y,width,height,width,height);
      }
      
      public native function moveTo(param1:Number, param2:Number) : void;
      
      public native function lineTo(param1:Number, param2:Number) : void;
      
      public native function curveTo(param1:Number, param2:Number, param3:Number, param4:Number) : void;
      
      [API("674")]
      public native function cubicCurveTo(param1:Number, param2:Number, param3:Number, param4:Number, param5:Number, param6:Number) : void;
      
      public native function endFill() : void;
      
      [Version("10")]
      public native function copyFrom(param1:Graphics) : void;
      
      [Version("10")]
      public native function lineBitmapStyle(param1:BitmapData, param2:Matrix = null, param3:Boolean = true, param4:Boolean = false) : void;
      
      [Version("10")]
      public native function lineShaderStyle(param1:Shader, param2:Matrix = null) : void;
      
      [Version("10")]
      public native function drawPath(param1:Vector.<int>, param2:Vector.<Number>, param3:String = "evenOdd") : void;
      
      [Version("10")]
      public native function drawTriangles(param1:Vector.<Number>, param2:Vector.<int> = null, param3:Vector.<Number> = null, param4:String = "none") : void;
      
      private function drawPathObject(path:IGraphicsPath) : void
      {
         var graphicsPath:GraphicsPath = null;
         var graphicsTrianglePath:GraphicsTrianglePath = null;
         if(path is GraphicsPath)
         {
            graphicsPath = GraphicsPath(path);
            this.drawPath(graphicsPath.commands,graphicsPath.data,graphicsPath.winding);
         }
         else if(path is GraphicsTrianglePath)
         {
            graphicsTrianglePath = GraphicsTrianglePath(path);
            this.drawTriangles(graphicsTrianglePath.vertices,graphicsTrianglePath.indices,graphicsTrianglePath.uvtData,graphicsTrianglePath.culling);
         }
      }
      
      private function beginFillObject(fill:IGraphicsFill) : void
      {
         var solidFill:GraphicsSolidFill = null;
         var gradientFill:GraphicsGradientFill = null;
         var bitmapFill:GraphicsBitmapFill = null;
         var shaderFill:GraphicsShaderFill = null;
         if(fill == null)
         {
            this.endFill();
         }
         else if(fill is GraphicsEndFill)
         {
            this.endFill();
         }
         else if(fill is GraphicsSolidFill)
         {
            solidFill = GraphicsSolidFill(fill);
            this.beginFill(solidFill.color,solidFill.alpha);
         }
         else if(fill is GraphicsGradientFill)
         {
            gradientFill = GraphicsGradientFill(fill);
            this.beginGradientFill(gradientFill.type,gradientFill.colors,gradientFill.alphas,gradientFill.ratios,gradientFill.matrix,gradientFill.spreadMethod,gradientFill.interpolationMethod,gradientFill.focalPointRatio);
         }
         else if(fill is GraphicsBitmapFill)
         {
            bitmapFill = GraphicsBitmapFill(fill);
            this.beginBitmapFill(bitmapFill.bitmapData,bitmapFill.matrix,bitmapFill.repeat,bitmapFill.smooth);
         }
         else if(fill is GraphicsShaderFill)
         {
            shaderFill = GraphicsShaderFill(fill);
            this.beginShaderFill(shaderFill.shader,shaderFill.matrix);
         }
      }
      
      private function beginStrokeObject(istroke:IGraphicsStroke) : void
      {
         var solidFill:GraphicsSolidFill = null;
         var gradientFill:GraphicsGradientFill = null;
         var bitmapFill:GraphicsBitmapFill = null;
         var shaderFill:GraphicsShaderFill = null;
         var stroke:GraphicsStroke = null;
         var fill:IGraphicsFill = null;
         if(istroke != null && istroke is GraphicsStroke)
         {
            stroke = istroke as GraphicsStroke;
         }
         if(Boolean(stroke) && Boolean(stroke.fill) && stroke.fill is IGraphicsFill)
         {
            fill = stroke.fill;
         }
         if(stroke == null || fill == null)
         {
            this.lineStyle();
         }
         else if(fill is GraphicsSolidFill)
         {
            solidFill = GraphicsSolidFill(fill);
            this.lineStyle(stroke.thickness,solidFill.color,solidFill.alpha,stroke.pixelHinting,stroke.scaleMode,stroke.caps,stroke.joints,stroke.miterLimit);
         }
         else if(fill is GraphicsGradientFill)
         {
            gradientFill = GraphicsGradientFill(fill);
            this.lineStyle(stroke.thickness,0,1,stroke.pixelHinting,stroke.scaleMode,stroke.caps,stroke.joints,stroke.miterLimit);
            this.lineGradientStyle(gradientFill.type,gradientFill.colors,gradientFill.alphas,gradientFill.ratios,gradientFill.matrix,gradientFill.spreadMethod,gradientFill.interpolationMethod,gradientFill.focalPointRatio);
         }
         else if(fill is GraphicsBitmapFill)
         {
            bitmapFill = GraphicsBitmapFill(fill);
            this.lineStyle(stroke.thickness,0,1,stroke.pixelHinting,stroke.scaleMode,stroke.caps,stroke.joints,stroke.miterLimit);
            this.lineBitmapStyle(bitmapFill.bitmapData,bitmapFill.matrix,bitmapFill.repeat,bitmapFill.smooth);
         }
         else if(fill is GraphicsShaderFill)
         {
            shaderFill = GraphicsShaderFill(fill);
            this.lineStyle(stroke.thickness,0,1,stroke.pixelHinting,stroke.scaleMode,stroke.caps,stroke.joints,stroke.miterLimit);
            this.lineShaderStyle(shaderFill.shader,shaderFill.matrix);
         }
      }
      
      [Version("10")]
      public function drawGraphicsData(graphicsData:Vector.<IGraphicsData>) : void
      {
         var item:IGraphicsData = null;
         var path:IGraphicsPath = null;
         var fill:IGraphicsFill = null;
         var stroke:IGraphicsStroke = null;
         if(graphicsData == null)
         {
            return;
         }
         for(var i:int = 0; i < graphicsData.length; i++)
         {
            item = graphicsData[i];
            if(item is IGraphicsPath)
            {
               path = IGraphicsPath(item);
               this.drawPathObject(path);
            }
            else if(item is IGraphicsFill)
            {
               fill = IGraphicsFill(item);
               this.beginFillObject(fill);
            }
            else if(item is IGraphicsStroke)
            {
               stroke = IGraphicsStroke(item);
               this.beginStrokeObject(stroke);
            }
         }
      }
      
      private native function nativeGetGraphicsData(param1:Vector.<IGraphicsData>, param2:Boolean) : void;
      
      [API("686")]
      public function readGraphicsData(recurse:Boolean = true) : Vector.<IGraphicsData>
      {
         var vec:Vector.<IGraphicsData> = new Vector.<IGraphicsData>();
         this.nativeGetGraphicsData(vec,recurse);
         return vec;
      }
   }
}

