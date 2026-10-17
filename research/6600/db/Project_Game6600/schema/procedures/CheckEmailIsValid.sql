-- SQL_STORED_PROCEDURE dbo.CheckEmailIsValid (modified 2015-01-25T14:04:48.410)
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[CheckEmailIsValid]
	-- Add the parameters for the stored procedure here
	@Email nvarchar(50),
@count int out
AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	SET NOCOUNT ON;
    -- Insert statements for procedure here
	SELECT @count=COUNT(*) from Sys_User_Info where UserEmail=@Email
END

GO
