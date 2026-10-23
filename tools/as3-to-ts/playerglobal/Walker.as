package
{
   use namespace AS3;
   
   internal final class Walker
   {
      
      internal var reviver:Function;
      
      public function Walker(reviver:Function)
      {
         super();
         this.reviver = reviver;
      }
      
      internal function walk(holder:Object, name:String) : *
      {
         var v:Array = null;
         var i:uint = 0;
         var limit:uint = 0;
         var newElement:* = undefined;
         var p:String = null;
         var val:Object = holder[name];
         if(val is Array)
         {
            v = val as Array;
            i = 0;
            limit = v.length;
            while(i < limit)
            {
               newElement = this.walk(v,String(i));
               if(newElement === undefined)
               {
                  delete v[i];
               }
               else
               {
                  v[i] = newElement;
               }
               i++;
            }
         }
         else if(val !== null && !(val is Boolean) && !(val is Number) && !(val is String))
         {
            for(p in val)
            {
               if(!val.hasOwnProperty(p))
               {
                  break;
               }
               newElement = this.walk(val,p);
               if(newElement === undefined)
               {
                  delete val[p];
               }
               else
               {
                  val[p] = newElement;
               }
            }
         }
         return this.reviver.call(holder,name,val);
      }
   }
}

