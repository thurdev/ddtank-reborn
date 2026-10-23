package road7th.utils
{
   import flash.errors.IllegalOperationError;
   import flash.utils.getDefinitionByName;
   import road7th.core.Global;
   import road7th.core.ddt_internal;
   
   use namespace ddt_internal;
   
   public class ClassUtils
   {
      
      public function ClassUtils()
      {
         super();
      }
      
      public static function CreatInstance(classname:String) : *
      {
         var instanceClass:Object = getDefinitionByName(classname);
         if(instanceClass == null)
         {
            throw new IllegalOperationError("can\'t find the class of\"" + classname + "\"in current domain");
         }
         return new instanceClass();
      }
      
      public static function hasDefinition(classname:String) : Boolean
      {
         return Global.Context.applicationDomain.hasDefinition(classname);
      }
   }
}

