package flash.media
{
   [native(cls="SoundTransformClass",gc="exact",instance="SoundTransformObject",methods="auto")]
   public final class SoundTransform
   {
      
      public function SoundTransform(vol:Number = 1, panning:Number = 0)
      {
         super();
         this.volume = vol;
         this.pan = panning;
      }
      
      public native function get volume() : Number;
      
      public native function set volume(param1:Number) : void;
      
      public native function get leftToLeft() : Number;
      
      public native function set leftToLeft(param1:Number) : void;
      
      public native function get leftToRight() : Number;
      
      public native function set leftToRight(param1:Number) : void;
      
      public native function get rightToRight() : Number;
      
      public native function set rightToRight(param1:Number) : void;
      
      public native function get rightToLeft() : Number;
      
      public native function set rightToLeft(param1:Number) : void;
      
      public function get pan() : Number
      {
         if(this.leftToRight == 0 && this.rightToLeft == 0)
         {
            return 1 - this.leftToLeft * this.leftToLeft;
         }
         return 0;
      }
      
      public function set pan(panning:Number) : void
      {
         this.leftToLeft = Math.sqrt(1 - panning);
         this.leftToRight = 0;
         this.rightToRight = Math.sqrt(1 + panning);
         this.rightToLeft = 0;
      }
   }
}

