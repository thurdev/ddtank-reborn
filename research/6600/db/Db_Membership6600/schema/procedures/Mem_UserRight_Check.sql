-- SQL_STORED_PROCEDURE dbo.Mem_UserRight_Check (modified 2012-04-21T07:54:31.123)

/*
作者：小危 创建时间:2008-9-25 修改人：小危 修改时间：2008-9-25 
描述：检验用户是否有权限
*/
CREATE  PROCEDURE  Mem_UserRight_Check
@ApplicationName Varchar(20),
@UserId Int,
@RightsId Int,
@ouototal varchar(50)='' output AS
   /*第一步：得到当前的应用程序编号*/
   DECLARE @ApplicationId  INT
   SELECT  @ApplicationId=ApplicationId FROM Mem_Application WHERE ApplicationName=@ApplicationName

   /*第二步：检验当前用户是否有权限*/   
   Select  @ouototal=Count(*) From Mem_UserRight  Where ApplicationId=@ApplicationId And UserId=@UserId And RightsId=@RightsId

GO
