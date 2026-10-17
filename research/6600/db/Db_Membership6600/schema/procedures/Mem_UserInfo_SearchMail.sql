-- SQL_STORED_PROCEDURE dbo.Mem_UserInfo_SearchMail (modified 2012-04-21T07:54:31.110)


CREATE   PROCEDURE Mem_UserInfo_SearchMail 
@USERID           nvarchar(256),
@EMAIL                     nvarchar(256),
@MAILCOUNT           int OUTPUT
AS
/*
作者：小危 创建时间:2008-9-25 修改人：小危 修改时间：2008-9-25 
查找当前用户的邮箱
*/
SELECT   @MAILCOUNT=count(*) FROM Mem_UserInfo  WHERE  EMAIL=@EMAIL AND userid=@USERID
GO
