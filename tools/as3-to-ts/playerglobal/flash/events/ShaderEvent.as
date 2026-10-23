package flash.events
{
   import flash.display.BitmapData;
   import flash.utils.ByteArray;
   
   [Version("10")]
   public class ShaderEvent extends Event
   {
      
      public static const COMPLETE:String = "complete";
      
      private var m_bitmapData:BitmapData;
      
      private var m_byteArray:ByteArray;
      
      private var m_vector:Vector.<Number>;
      
      public function ShaderEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, bitmap:BitmapData = null, array:ByteArray = null, vector:Vector.<Number> = null)
      {
         super(type,bubbles,cancelable);
         this.m_bitmapData = bitmap;
         this.m_byteArray = array;
         this.m_vector = vector;
      }
      
      override public function clone() : Event
      {
         return new ShaderEvent(type,bubbles,cancelable,this.bitmapData,this.byteArray,this.vector);
      }
      
      override public function toString() : String
      {
         return formatToString("ShaderEvent","type","bubbles","cancelable","eventPhase","bitmapData","byteArray","vector");
      }
      
      public function get bitmapData() : BitmapData
      {
         return this.m_bitmapData;
      }
      
      public function set bitmapData(bmpData:BitmapData) : *
      {
         this.m_bitmapData = bmpData;
      }
      
      public function get byteArray() : ByteArray
      {
         return this.m_byteArray;
      }
      
      public function set byteArray(bArray:ByteArray) : *
      {
         this.m_byteArray = bArray;
      }
      
      public function get vector() : Vector.<Number>
      {
         return this.m_vector;
      }
      
      public function set vector(v:Vector.<Number>) : *
      {
         this.m_vector = v;
      }
   }
}

