-- SQL_STORED_PROCEDURE dbo.Ddt_User_Del_Sto (modified 2012-04-21T07:53:25.013)
--创建人:Vivi	--创建时间:2009-10-28 -说明:用户删除
CREATE  PROCEDURE [dbo].[Ddt_User_Del_Sto] 
@UserId varchar(256),
@ApplicationName varchar(200)
AS      
Begin            
    Declare @Count Integer
    Set @Count=0

   /*0、先区分当前用户是否*/   
    SELECT @Count=Count(*) FROM Db_Membership.dbo.Mem_Application_User Where LowerApplicationName=LOWER(@ApplicationName) And UserId=@UserId 
   
    If @Count=0
      Begin
        Return -1
      End

  /*1、得到应用程序ID*/
    DECLARE @ApplicationId int 
    SELECT  @ApplicationId=ApplicationId  FROM Mem_Application WHERE LowerApplicationName=LOWER(@ApplicationName)
    
  /*2、删除用户*/
    Delete From Db_Membership.dbo.Mem_Users Where UserId=@UserId and ApplicationId=@ApplicationId

  /*4、删除用户资料*/
    Delete From Db_Membership.dbo.Mem_UserInfo Where UserId=@UserId and ApplicationId=@ApplicationId

    Return 0
End


GO
