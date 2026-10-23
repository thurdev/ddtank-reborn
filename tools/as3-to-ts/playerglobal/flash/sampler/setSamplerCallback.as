package flash.sampler
{
   public function setSamplerCallback(f:Function) : void
   {
      var wrapper:* = undefined;
      if(f != null)
      {
         wrapper = function():*
         {
            var ret:Boolean = true;
            try
            {
               f();
            }
            catch(e:*)
            {
               ret = false;
            }
            return ret;
         };
         _setSamplerCallback(wrapper);
      }
      else
      {
         _setSamplerCallback(null);
      }
   }
}

