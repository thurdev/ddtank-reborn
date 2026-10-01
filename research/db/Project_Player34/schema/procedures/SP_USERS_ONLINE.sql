-- SQL_STORED_PROCEDURE dbo.SP_USERS_ONLINE (modified 2021-06-04T05:18:36.257)






-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[SP_USERS_ONLINE]
	-- Add the parameters for the stored procedure here
	@UserID int
AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	SET NOCOUNT ON;

    -- Insert statements for procedure here
	UPDATE Sys_Users_Detail SET [State]=1 WHERE UserID=@UserID
END








GO
