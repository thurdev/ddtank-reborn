package flash.events
{
   [API("667")]
   public class AccelerometerEvent extends Event
   {
      
      public static const UPDATE:String = "update";
      
      private var m_accelerationX:Number;
      
      private var m_accelerationY:Number;
      
      private var m_accelerationZ:Number;
      
      private var m_timestamp:Number;
      
      public function AccelerometerEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, timestamp:Number = 0, accelerationX:Number = 0, accelerationY:Number = 0, accelerationZ:Number = 0)
      {
         super(type,bubbles,cancelable);
         this.m_accelerationX = accelerationX;
         this.m_accelerationY = accelerationY;
         this.m_accelerationZ = accelerationZ;
         this.m_timestamp = timestamp;
      }
      
      override public function clone() : Event
      {
         return new AccelerometerEvent(type,bubbles,cancelable,this.m_timestamp,this.m_accelerationX,this.m_accelerationY,this.m_accelerationZ);
      }
      
      override public function toString() : String
      {
         return formatToString("AccelerometerEvent","type","bubbles","cancelable","timestamp","accelerationX","accelerationY","accelerationZ");
      }
      
      public function get accelerationX() : Number
      {
         return this.m_accelerationX;
      }
      
      public function set accelerationX(value:Number) : void
      {
         this.m_accelerationX = value;
      }
      
      public function get accelerationY() : Number
      {
         return this.m_accelerationY;
      }
      
      public function set accelerationY(value:Number) : void
      {
         this.m_accelerationY = value;
      }
      
      public function get accelerationZ() : Number
      {
         return this.m_accelerationZ;
      }
      
      public function set accelerationZ(value:Number) : void
      {
         this.m_accelerationZ = value;
      }
      
      public function get timestamp() : Number
      {
         return this.m_timestamp;
      }
      
      public function set timestamp(value:Number) : void
      {
         this.m_timestamp = value;
      }
   }
}

