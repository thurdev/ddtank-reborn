package road7th.utils
{
   public class TeamUtils
   {
      
      public function TeamUtils()
      {
         super();
      }
      
      public static function getTeamColor(team:int) : int
      {
         switch(team)
         {
            case 1:
               return 13260;
            case 2:
               return 16711680;
            case 3:
               return 16763904;
            case 4:
               return 10079232;
            case 5:
               return 6697932;
            case 6:
               return 10053171;
            case 7:
               return 16751052;
            case 8:
         }
         return 3381606;
      }
   }
}

