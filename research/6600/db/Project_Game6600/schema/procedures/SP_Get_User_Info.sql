-- SQL_STORED_PROCEDURE dbo.SP_Get_User_Info (modified 2015-01-25T14:04:48.630)
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Get_User_Info] 
	-- Add the parameters for the stored procedure here
@UserID int
AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	SET NOCOUNT ON;

    -- Insert statements for procedure here
	SELECT * from Sys_User_Info Where UserID=@UserId
END

GO
