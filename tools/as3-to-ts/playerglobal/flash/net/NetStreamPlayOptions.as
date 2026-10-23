package flash.net
{
   import flash.events.EventDispatcher;
   
   [native(cls="NetStreamPlayOptionsClass",instance="NetStreamPlayOptionsObject",methods="auto")]
   [API("662")]
   public dynamic class NetStreamPlayOptions extends EventDispatcher
   {
      
      public var streamName:String;
      
      public var oldStreamName:String;
      
      public var start:Number;
      
      public var len:Number;
      
      [API("667")]
      public var offset:Number;
      
      public var transition:String;
      
      public function NetStreamPlayOptions()
      {
         super();
         this.start = -2;
         this.len = -1;
         this.offset = -1;
      }
   }
}

