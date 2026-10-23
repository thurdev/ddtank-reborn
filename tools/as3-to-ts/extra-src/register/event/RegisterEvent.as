package register.event
{
   import flash.events.Event;
   
   public class RegisterEvent extends Event
   {
      
      public static const CheckNickName:String = "chkName";
      
      public static const EnterGame:String = "Enter";
      
      public static const ChageSex:String = "change";
      
      public static const NewEnterGame:String = "NewEnter";
      
      public static const OldEnterGame:String = "OldEnter";
      
      public function RegisterEvent(type:String, bubbles:Boolean = false, cancelable:Boolean = false)
      {
         super(type,bubbles,cancelable);
      }
   }
}

