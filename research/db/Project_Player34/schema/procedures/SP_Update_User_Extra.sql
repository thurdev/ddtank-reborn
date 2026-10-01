-- SQL_STORED_PROCEDURE dbo.SP_Update_User_Extra (modified 2021-06-04T05:18:35.887)



-- =============================================
-- Author:		Justin
-- Create date: 2008.11.26
-- Description:	插入用户购买物品信息
-- =============================================
CREATE PROCEDURE [dbo].[SP_Update_User_Extra]
	@UserID			int,
	@LastTimeHotSpring					datetime,
	@MinHotSpring					int,
	@coupleBossEnterNum int,
	@coupleBossHurt int,
	@coupleBossBoxNum int,
	@LastFreeTimeHotSpring datetime,
	@isGetAwardMarry bit,
	@isFirstAwardMarry bit,
	@LeftRoutteCount int,
	@LeftRoutteRate float,
	@FreeSendMailCount int
AS
BEGIN
	declare @count int 
	select @count = COUNT(UserID) FROM Sys_Users_Extra WHERE UserID = @UserID
	if @count != 0
	begin
		update Sys_Users_Extra SET LastTimeHotSpring = @LastTimeHotSpring,
								MinHotSpring = @MinHotSpring,coupleBossEnterNum=@coupleBossEnterNum,coupleBossHurt=@coupleBossHurt,coupleBossBoxNum=@coupleBossBoxNum,LastFreeTimeHotSpring=@LastFreeTimeHotSpring,isGetAwardMarry=@isGetAwardMarry,
								isFirstAwardMarry=@isFirstAwardMarry,LeftRoutteCount=@LeftRoutteCount,LeftRoutteRate=@LeftRoutteRate,FreeSendMailCount=@FreeSendMailCount
																WHERE UserID = @UserID
																return 0
	end
	else
	begin
		insert into Sys_Users_Extra (UserID,
									LastTimeHotSpring,
									MinHotSpring,
									coupleBossEnterNum,
									coupleBossHurt,
									coupleBossBoxNum,
									LastFreeTimeHotSpring,
									isGetAwardMarry,
									isFirstAwardMarry,
									LeftRoutteCount,
									LeftRoutteRate,
									FreeSendMailCount) VALUES 
									
									(@UserID
									,@LastTimeHotSpring
									,@MinHotSpring
									,@coupleBossEnterNum
									,@coupleBossHurt
									,@coupleBossBoxNum
									,@LastFreeTimeHotSpring
									,@isGetAwardMarry
									,@isFirstAwardMarry
									,@LeftRoutteCount
									,@LeftRoutteRate,
									@FreeSendMailCount)
									return 0
	end
	if @@error <> 0
	begin
		return 1
	end
	
	return 0
END





GO
