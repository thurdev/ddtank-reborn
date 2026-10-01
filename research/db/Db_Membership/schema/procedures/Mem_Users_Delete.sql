-- SQL_STORED_PROCEDURE dbo.Mem_Users_Delete (modified 2012-04-21T07:54:31.123)

CREATE  PROCEDURE [dbo].[Mem_Users_Delete]
    @ApplicationName  varchar(200),    
    @UserId           int 
AS
BEGIN
/*
创建人：小危 创建时间:2008-9-25  修改人：小危 修改时间:2008-9-25
描述：删除用户的存储过程
*/
   /*得到当前所在的编号*/
   DECLARE @ApplicationId  INT
   SELECT  @ApplicationId=ApplicationId FROM Mem_Application WHERE ApplicationName=@ApplicationName
   /*删除用户表*/
   Delete  FROM   Mem_UserInfo Where ApplicationId=@ApplicationId And UserId=@UserId

   /*删除用户资料*/
   Delete    From   Mem_Users Where ApplicationId=@ApplicationId And UserId=@UserId

   /*删除用户权限表*/
   Delete   From   Mem_UserRight Where ApplicationId=@ApplicationId And UserId=@UserId
   
   

END

GO
