-- SQL_STORED_PROCEDURE dbo.Mem_UserInfo_AddPasswordWay (modified 2012-04-21T07:54:31.123)

CREATE  PROCEDURE Mem_UserInfo_AddPasswordWay 
@ApplicationName Varchar(256),
@UserName Varchar(256),
@PasswordFormat int OUTPUT,
@PasswordSalt Varchar(128) OUTPUT
AS
/*
作者：小危 创建时间:2008-9-25 修改人：小危 修改时间：2008-9-25 
得到用户加密方式和加密字符串
*/
  /*定义ApplicationId编号*/
  Declare @ApplicationId Integer
  Select @ApplicationId=ApplicationId From Mem_Application Where ApplicationName=@ApplicationName

  /*返回加密方式*/
  Select @PasswordFormat=A.PasswordFormat,@PasswordSalt=A.PasswordSalt From Mem_UserInfo A
     Left Outer Join Mem_Users B
          ON A.UserId=B.UserId And A.ApplicationId=B.ApplicationId
          Where A.ApplicationId=@ApplicationId

GO
