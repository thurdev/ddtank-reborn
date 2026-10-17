-- SQL_STORED_PROCEDURE dbo.SP_UpdateUserDrillInfo (modified 2015-01-25T14:04:48.217)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_UpdateUserDrillInfo]   
			@UserID int
		   ,@BeadPlace int
           ,@HoleExp int
           ,@HoleLv int
           ,@DrillPlace int
           
           
 AS    
   begin 

UPDATE [dbo].[Sys_User_Drills]
   SET [HoleExp] = @HoleExp,
        [HoleLv] = @HoleLv
 WHERE [DrillPlace] = @DrillPlace and [UserID] = @UserID
  return 0
    end
if(@@error <> 0)
begin
  return 1 
end

GO
