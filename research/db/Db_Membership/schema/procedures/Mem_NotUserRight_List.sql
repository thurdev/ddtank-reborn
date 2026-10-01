-- SQL_STORED_PROCEDURE dbo.Mem_NotUserRight_List (modified 2012-04-21T07:54:31.110)



/*
作者：小危 创建时间:2008-9-25 修改人：小危 修改时间：2008-9-25 
描述：用户未分配权限列表
*/
CREATE     PROCEDURE Mem_NotUserRight_List
@ApplicationName Varchar(20),
@UserId int
 AS

   /*得到当前的应用程序编号*/
   DECLARE @ApplicationId  INT
   SELECT  @ApplicationId=ApplicationId FROM Mem_Application WHERE ApplicationName=@ApplicationName


   Select  '' as UserId, RightsId,RightsName From   Mem_Right A
   Where ApplicationId=@ApplicationId 
         And  NOT EXISTS    (SELECT *    FROM Mem_UserRight   WHERE RightsId = A.RightsId   AND ApplicationId=@ApplicationId And UserId=@UserId)
    


GO
