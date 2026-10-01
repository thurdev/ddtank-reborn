-- SQL_STORED_PROCEDURE dbo.Mem_UserRight_Del (modified 2012-04-21T07:54:31.123)

/*
作者：小危 创建时间:2008-9-25 修改人：小危 修改时间：2008-9-25 
描述：册除当前用户权限
*/
CREATE PROCEDURE Mem_UserRight_Del  
@ApplicationName Varchar(20), 
@UserId Int
AS
  /*得到当前的应用程序编号*/
   DECLARE @ApplicationId  INT
   SELECT  @ApplicationId=ApplicationId FROM Mem_Application WHERE ApplicationName=@ApplicationName

  /**删除用户权限*/
  Delete From  Mem_UserRight Where ApplicationId=@ApplicationId And UserId=@UserId
GO
