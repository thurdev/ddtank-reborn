-- SQL_STORED_PROCEDURE dbo.Mem_UserInfo_List (modified 2012-04-21T07:54:31.123)
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE Mem_UserInfo_List
    @ApplicationName  varchar(200),    
    @UserId           int 
AS
BEGIN
	Select * From Mem_UserInfo
END

GO
