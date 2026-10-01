-- SQL_STORED_PROCEDURE dbo.SP_Insert_UsersLog (modified 2021-06-04T05:18:35.500)







-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_UsersLog] 
	-- Add the parameters for the stored procedure here
	@UserID int,
	@UserName nvarchar(100),
	@NickName nvarchar(100),
	@Type nvarchar(50),
	@Content nvarchar(500)
AS
BEGIN

    -- Insert statements for procedure here
	INSERT INTO Sys_Users_Log(UserID, UserName, NickName, [Type], [Content]) VALUES (@UserID, @UserName, @NickName, @Type, @Content)
END








GO
