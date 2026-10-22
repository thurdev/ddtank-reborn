package flash.events
{
   [API("668")]
   public class GeolocationEvent extends Event
   {
      
      public static const UPDATE:String = "update";
      
      private var m_latitude:Number;
      
      private var m_longitude:Number;
      
      private var m_altitude:Number;
      
      private var m_horizontalAccuracy:Number;
      
      private var m_verticalAccuracy:Number;
      
      private var m_speed:Number;
      
      private var m_heading:Number;
      
      private var m_timestamp:Number;
      
      public function GeolocationEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false, latitude:Number = 0, longitude:Number = 0, altitude:Number = 0, hAccuracy:Number = 0, vAccuracy:Number = 0, speed:Number = 0, heading:Number = 0, timestamp:Number = 0)
      {
         super(type,bubbles,cancelable);
         this.m_latitude = latitude;
         this.m_longitude = longitude;
         this.m_altitude = altitude;
         this.m_horizontalAccuracy = hAccuracy;
         this.m_verticalAccuracy = vAccuracy;
         this.m_speed = speed;
         this.m_heading = heading;
         this.m_timestamp = timestamp;
      }
      
      override public function clone() : Event
      {
         return new GeolocationEvent(type,bubbles,cancelable,this.m_latitude,this.m_longitude,this.m_altitude,this.m_horizontalAccuracy,this.m_verticalAccuracy,this.m_speed,this.m_heading,this.m_timestamp);
      }
      
      override public function toString() : String
      {
         return formatToString("GeolocationEvent","type","bubbles","cancelable","latitude","longitude","altitude","horizontalAccuracy","verticalAccuracy","speed","heading","timestamp");
      }
      
      public function get latitude() : Number
      {
         return this.m_latitude;
      }
      
      public function set latitude(value:Number) : void
      {
         this.m_latitude = value;
      }
      
      public function get longitude() : Number
      {
         return this.m_longitude;
      }
      
      public function set longitude(value:Number) : void
      {
         this.m_longitude = value;
      }
      
      public function get altitude() : Number
      {
         return this.m_altitude;
      }
      
      public function set altitude(value:Number) : void
      {
         this.m_altitude = value;
      }
      
      public function get horizontalAccuracy() : Number
      {
         return this.m_horizontalAccuracy;
      }
      
      public function set horizontalAccuracy(value:Number) : void
      {
         this.m_horizontalAccuracy = value;
      }
      
      public function get verticalAccuracy() : Number
      {
         return this.m_verticalAccuracy;
      }
      
      public function set verticalAccuracy(value:Number) : void
      {
         this.m_verticalAccuracy = value;
      }
      
      public function get speed() : Number
      {
         return this.m_speed;
      }
      
      public function set speed(value:Number) : void
      {
         this.m_speed = value;
      }
      
      public function get heading() : Number
      {
         return this.m_heading;
      }
      
      public function set heading(value:Number) : void
      {
         this.m_heading = value;
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

