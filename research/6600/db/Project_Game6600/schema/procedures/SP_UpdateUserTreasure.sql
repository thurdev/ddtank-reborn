-- SQL_STORED_PROCEDURE dbo.SP_UpdateUserTreasure (modified 2015-01-25T14:04:48.210)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_UpdateUserTreasure] 
		   @UserID int
           ,@NickName nvarchar(50)
           ,@logoinDays int
           ,@treasure int
           ,@treasureAdd int
           ,@friendHelpTimes int
           ,@isEndTreasure bit
           ,@isBeginTreasure bit
           ,@LastLoginDay datetime 
 AS    
   begin 
UPDATE [dbo].[Sys_User_Treasure]
   SET [NickName] = @NickName
      ,[logoinDays] = @logoinDays
      ,[treasure] = @treasure
      ,[treasureAdd] = @treasureAdd
      ,[friendHelpTimes] = @friendHelpTimes
      ,[isEndTreasure] = @isEndTreasure
      ,[isBeginTreasure] = @isBeginTreasure
      ,[LastLoginDay] = @LastLoginDay
 WHERE [UserID] = @UserID
   return 0
           end
if(@@error <> 0)
begin
 return 1  
end

GO
