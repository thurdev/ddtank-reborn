-- SQL_STORED_PROCEDURE dbo.st_Login (modified 2012-04-21T07:55:34.280)
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[st_Login]
	@username nvarchar(32),
	@password nvarchar(200)	
AS
BEGIN
Declare @id int;
set @id = (select [ID] from Users where [Username]=@username and [Password]=@password)
If (ISNULL(@id,0) > 0)
	Return @id;
else
	Return -1;

END
GO
