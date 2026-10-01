-- SQL_STORED_PROCEDURE dbo.SP_Users_Record_Add (modified 2021-06-04T05:18:36.280)






-- =============================================
-- Author:		bTh
-- Create date: 2017.03.11
-- Description:	插入用户购买物品信息
-- =============================================
CREATE PROCEDURE [dbo].[SP_Users_Record_Add]
	@UserID			int,
	@RecordID	int,
	@Total	int
AS
BEGIN
	declare @count int 
	select @count = COUNT(UserID) FROM Sys_Users_Record WHERE UserID = @UserID AND RecordID = @RecordID
	if @count != 0
	begin
		update Sys_Users_Record SET Total = @Total
								,RecordID = @RecordID
																WHERE UserID = @UserID AND RecordID = @RecordID
	end
	else
	begin
		insert into Sys_Users_Record (UserID,
									RecordID,
									Total) VALUES 
									
									(@UserID
									,@RecordID
									,@Total)
	end
	if @@error <> 0
	begin
		return 1
	end
	
	return 0
END






GO
