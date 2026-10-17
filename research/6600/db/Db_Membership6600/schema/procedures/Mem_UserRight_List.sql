-- SQL_STORED_PROCEDURE dbo.Mem_UserRight_List (modified 2012-04-21T07:54:31.110)

/*
作者：小危 创建时间:2008-9-25 修改人：小危 修改时间：2008-9-25 
描述：用户权限列表
*/
CREATE   PROCEDURE Mem_UserRight_List
@ApplicationName Varchar(20),
@UserId int
 AS

   /*得到当前的应用程序编号*/
   DECLARE @ApplicationId  INT
   SELECT  @ApplicationId=ApplicationId FROM Mem_Application WHERE ApplicationName=@ApplicationName


    Select A.UserID,A.RightsId, B.RightsName From Mem_UserRight A 
    Left Outer Join Mem_Right B
       On A.RightsId=B.RightsId And A.ApplicationId=B.ApplicationId     
    Where A.ApplicationId=@ApplicationId And A.UserId=@UserId
 
 

GO
