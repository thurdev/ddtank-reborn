package flash.utils
{
   public function setInterval(closure:Function, delay:Number, ... arguments) : uint
   {
      return new SetIntervalTimer(closure,delay,true,arguments).id;
   }
}

