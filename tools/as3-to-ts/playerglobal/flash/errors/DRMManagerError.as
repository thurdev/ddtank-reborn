package flash.errors
{
   [API("667")]
   public class DRMManagerError extends Error
   {
      
      private var _subErrorID:int;
      
      public function DRMManagerError(message:String, id:int, subErrorID:int)
      {
         super(message,id);
         this._subErrorID = subErrorID;
      }
      
      public function get subErrorID() : int
      {
         return this._subErrorID;
      }
      
      public function toString() : String
      {
         return "DRMManagerError: \'" + message + "\', error ID:\'" + errorID.toString() + "\', subErrorID:\'" + this._subErrorID.toString() + "\'";
      }
   }
}

