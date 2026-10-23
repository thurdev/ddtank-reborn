package flash.utils
{
   [native(cls="DictionaryClass",gc="exact",instance="DictionaryObject",methods="auto")]
   public dynamic class Dictionary
   {
      
      prototype.toJSON = function(k:String):*
      {
         return "Dictionary";
      };
      _dontEnumPrototype(prototype);
      
      public function Dictionary(weakKeys:Boolean = false)
      {
         super();
         this.init(weakKeys);
      }
      
      private native function init(param1:Boolean) : void;
   }
}

