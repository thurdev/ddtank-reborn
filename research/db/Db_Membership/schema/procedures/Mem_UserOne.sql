-- SQL_STORED_PROCEDURE dbo.Mem_UserOne (modified 2012-04-21T07:54:31.123)

-- =============================================
-- Author:		<xiaov>
-- Create date: <2009-06-12>
-- Description:	<获取当前用户信息>
-- =============================================
CREATE PROCEDURE [dbo].[Mem_UserOne]
    @ApplicationName  varchar(200),    
    @UserId           int 
AS
BEGIN

   /*得到当前的应用程序编号*/
   DECLARE @ApplicationId  INT
   SELECT  @ApplicationId=ApplicationId FROM Mem_Application WHERE ApplicationName=@ApplicationName

  Select  A.ApplicationId, A.UserId, A.UserName, A.LowerName, A.MobileAlias, A.IsAnonymous, A.LastActivityDate, A.LoginTime, C.RoleId, 
                      C.RoleName
 From Mem_Users A                
           Left Outer Join Mem_UsersInRoles B
                On A.UserId=B.UserId
           Left Outer Join Mem_Roles C
                On B.RoleId=C.RoleId
           Where A.ApplicationId=@ApplicationId And A.UserId=@UserId And C.ApplicationId=@ApplicationId
  
 

END


GO
