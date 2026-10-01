-- SQL_STORED_PROCEDURE dbo.st_GetUserInfo (modified 2012-04-21T07:55:39.733)
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[st_GetUserInfo]
@id int
AS
BEGIN

select * from Users where [ID]=@id

END
GO
