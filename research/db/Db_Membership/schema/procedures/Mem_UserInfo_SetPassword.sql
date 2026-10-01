-- SQL_STORED_PROCEDURE dbo.Mem_UserInfo_SetPassword (modified 2012-04-21T07:54:31.110)




CREATE   PROCEDURE dbo.Mem_UserInfo_SetPassword
    @ApplicationName  nvarchar(256),
    @UserName         nvarchar(256),
    @NewPassword      nvarchar(128),
    @PasswordSalt     nvarchar(128),
    @CurrentTimeUtc   datetime,
    @PasswordFormat   int = 0
AS
BEGIN
/*
作者：小危 创建时间:2008-9-25 修改人：小危 修改时间：2008-9-25 
描述：修改用户密码
*/

    /*用户名编号*/
    DECLARE @UserId int 
    SELECT  @UserId = NULL             

    /*获取当前用户编号*/
    SELECT @UserId = u.UserId
    FROM Mem_Application A,Mem_Users U,Mem_UserInfo I
    WHERE A.ApplicationId=U.ApplicationId AND
          U.LowerName=LOWER(@UserName) AND
          LOWER(@ApplicationName)=A.LowerApplicationName AND
          U.UserId=I.UserId
              
    /*如果访用户ID为空则返回1*/
    IF (@UserId IS NULL)
        RETURN(1)

    /*更新当前用户密码*/
    UPDATE dbo.Mem_UserInfo
    SET Password = @NewPassword, PasswordFormat = @PasswordFormat, PasswordSalt = @PasswordSalt,
        LastPasswordChangeDate = @CurrentTimeUtc
    WHERE @UserId = UserId
    RETURN(0)
END
GO
