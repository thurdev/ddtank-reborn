-- SQL_STORED_PROCEDURE dbo.SP_Update_AchievementData (modified 2021-06-04T05:18:35.833)






-- =============================================
-- Author:		Justin
-- Create date: 2008.11.26
-- Description:	插入用户购买物品信息
-- =============================================
CREATE PROCEDURE [dbo].[SP_Update_AchievementData]
	@UserID			int,
	@AchievementID	int,
	@IsComplete	bit,
	@CompletedDate	datetime
AS
BEGIN
	declare @count int 
	select @count = COUNT(UserID) FROM AchievementData WHERE UserID = @UserID AND AchievementID = @AchievementID
	if @count != 0
	begin
		update AchievementData SET IsComplete = @IsComplete
								,CompletedDate = @CompletedDate
																WHERE UserID = @UserID AND AchievementID = @AchievementID
	end
	else
	begin
		insert into AchievementData (UserID,
									AchievementID,
									IsComplete,
									CompletedDate) VALUES 
									
									(@UserID
									,@AchievementID
									,@IsComplete
									,@CompletedDate)
	end
	if @@error <> 0
	begin
		return 1
	end
	
	return 0
END






GO
