-- SQL_STORED_PROCEDURE dbo.SP_User_Avatar_Colection_Update (modified 2015-01-25T14:04:48.253)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_User_Avatar_Colection_Update] 
			@ID int
		   ,@UserID int
           ,@endTime datetime
           ,@dataId int
           ,@ActiveCount int
           ,@Sex int
 AS    
   begin    
	UPDATE [dbo].[User_Avatar_Colection]
    SET [UserID] = @UserID
       ,[endTime] = @endTime
       ,[dataId] = @dataId
       ,[ActiveCount] = @ActiveCount
       ,[Sex] = @Sex
	WHERE [ID] = @ID and [UserID] =@UserID 
   return 0
   end
if(@@error <> 0)
begin
 return 1 
end

GO
