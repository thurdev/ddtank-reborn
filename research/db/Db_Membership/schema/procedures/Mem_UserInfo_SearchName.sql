-- SQL_STORED_PROCEDURE dbo.Mem_UserInfo_SearchName (modified 2012-04-21T07:54:31.110)

CREATE  PROCEDURE Mem_UserInfo_SearchName
@UserName                     nvarchar(256),
@UserCOUNT           int OUTPUT
AS
/*
作者：小危 创建时间:2008-9-25 修改人：小危 修改时间：2008-9-25 
查找当前用户的是否存在
*/

SELECT @UserCOUNT =count(*) FROM Mem_Users  WHERE  UserName=@UserName
GO
