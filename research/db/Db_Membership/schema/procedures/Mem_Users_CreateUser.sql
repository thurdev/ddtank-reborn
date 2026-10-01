-- SQL_STORED_PROCEDURE dbo.Mem_Users_CreateUser (modified 2012-04-21T07:54:31.110)







CREATE        PROCEDURE [dbo].Mem_Users_CreateUser
    @ApplicationName  varchar(200),
    @UserName         nvarchar(256),
    @password         nvarchar(256),
    @email            nvarchar(256),
    @PasswordFormat   Int,
    @PasswordSalt     Nvarchar(128),    
    @UserSex bit,
    @UserId           int OUTPUT
AS
BEGIN
/*
创建人：小危 创建时间:2008-9-25  修改人：小危 修改时间:2008-9-25
描述：这是往mem_users表插入数据,返回userid编号
*/

    Declare @LastActivityDate DATETIME
    Set @LastActivityDate=getdate()

    Declare @Count Integer
    Set @Count=0

    /*0、先区分当前用户是否*/   
    SELECT @Count=Count(*) FROM Mem_Application_User Where LowerApplicationName=LOWER(@ApplicationName) And UserName=@UserName
    If @Count!=0
      Begin
        Return -1
      End

    /*1、新建一个用户编号*/
    EXEC Mem_Code_Sto 'user',@UserId output

    /*2、得到应用程序ID*/
    DECLARE @ApplicationId int 
    SELECT  @ApplicationId=ApplicationId  FROM Mem_Application WHERE LowerApplicationName=LOWER(@ApplicationName) 
  
    /*3、插入用户*/
    INSERT dbo.Mem_Users (ApplicationId, UserId, UserName, LowerName, LastActivityDate)
    VALUES (@ApplicationId, @UserId, @UserName, LOWER(@UserName),  @LastActivityDate)

    /*4、创建用户资料*/
    Insert dbo.Mem_UserInfo(ApplicationId, UserId, Password, PasswordFormat, PasswordSalt,Email,CreateDate,UserSex)
    Values(@ApplicationId, @UserId, @Password, @PasswordFormat, @PasswordSalt,@Email,@LastActivityDate,@UserSex)
    RETURN 0
END
GO
