package flash.media
{
   import flash.net.URLRequest;
   import flash.net.URLStream;
   
   [native(cls="AVURLStreamClass",instance="AVURLStreamObject",methods="auto")]
   public class AVURLStream extends URLStream
   {
      
      public function AVURLStream()
      {
         super();
      }
      
      override public native function load(param1:URLRequest) : void;
      
      public native function set cookieHeader(param1:String) : void;
   }
}

