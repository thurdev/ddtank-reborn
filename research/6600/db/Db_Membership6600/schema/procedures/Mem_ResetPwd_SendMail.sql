-- SQL_STORED_PROCEDURE dbo.Mem_ResetPwd_SendMail (modified 2012-04-21T07:54:31.110)

CREATE  PROCEDURE Mem_ResetPwd_SendMail
@ApplicationName VARCHAR(256),
@UserName VARCHAR(256),
@SaleEntry uniqueidentifier
AS
/*
创建人：小危 创建时间:2008-9-25  修改人：小危 修改时间:2008-9-25
描述：用户找回密码，向邮箱发当前的安全码
*/
    /*定义@ApplicationID编号*/
    Declare @ApplicationId INT
    SELECT @ApplicationId=ApplicationId FROM Mem_Application WHERE ApplicationName=@ApplicationName

    /*定义@UserId编号*/
    Declare @UserID INT
    SELECT @UserID=UserID FROM Mem_Users WHERE ApplicationId=@ApplicationId AND UserName=@UserName

    /*向表中插入数据*/
    INSERT INTO Mem_ResetPwd(ApplicationId,UserId,SaleEntry) VALUES(@ApplicationId,@UserId,@SaleEntry)

GO
