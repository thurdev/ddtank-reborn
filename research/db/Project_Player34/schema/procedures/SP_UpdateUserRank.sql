-- SQL_STORED_PROCEDURE dbo.SP_UpdateUserRank (modified 2021-06-04T05:45:41.693)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_UpdateUserRank] 
			@ID int
		   ,@UserID int
           ,@UserRank nvarchar(500)
           ,@Attack int
           ,@Defence int
           ,@Luck int
           ,@Agility int
           ,@HP int
           ,@Damage int
           ,@Guard int
           ,@BeginDate datetime
           ,@Validate int
           ,@IsExit bit
		   ,@NewTitleID int
		   ,@EndDate datetime
                      
 AS    
   begin 
UPDATE [dbo].[Sys_User_Rank]
   SET [UserRank] = @UserRank
      ,[Attack] = @Attack
      ,[Defence] = @Defence
      ,[Luck] = @Luck
      ,[Agility] = @Agility
      ,[HP] = @HP
      ,[Damage] = @Damage
      ,[Guard] = @Guard
      ,[BeginDate] = @BeginDate
      ,[Validate] = @Validate
      ,[IsExit] = @IsExit
	  ,[NewTitleID] = @NewTitleID
	  ,[EndDate] = @EndDate
 WHERE [UserID] = @UserID and [ID] = @ID

   return 0
   end
if(@@error <> 0)
begin
 return 1 
end










GO
