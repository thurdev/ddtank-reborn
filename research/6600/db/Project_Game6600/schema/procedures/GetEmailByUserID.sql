-- SQL_STORED_PROCEDURE dbo.GetEmailByUserID (modified 2015-01-25T14:04:48.410)
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
Create PROCEDURE [dbo].[GetEmailByUserID]
	-- Add the parameters for the stored procedure here
@UserID nvarchar(50)

AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	SET NOCOUNT ON;
    -- Insert statements for procedure here
	SELECT * from Sys_User_Info where UserID=@UserID
END

GO
