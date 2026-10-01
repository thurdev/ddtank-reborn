-- SQL_STORED_PROCEDURE dbo.SP_Users_Record_All (modified 2021-06-04T05:18:36.283)
-- =============================================
-- Author:		<bTh fb.com/ybthh>
-- Create date: <2017-03-11>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Users_Record_All]
	@UserID int
AS
    SELECT * FROM Sys_Users_Record WHERE UserID = @UserID

GO
