-- SQL_STORED_PROCEDURE dbo.st_GetUserName (modified 2012-04-21T07:55:36.750)
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[st_GetUserName]
@Username		VARCHAR(32)
AS
BEGIN

select * from Users where [Username]=@Username

END
GO
