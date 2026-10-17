-- SQL_STORED_PROCEDURE dbo.Mem_UserRight_Save (modified 2012-04-21T07:54:31.123)
/*
作者：小危 创建时间:2008-9-25 修改人：小危 修改时间：2008-9-25 
描述：新增当前用户权限
*/
CREATE  PROCEDURE Mem_UserRight_Save  
 @ApplicationName nvarchar(512), 
 @UserID  int, 
 @RightsId int, 
 @op varchar(50), 
 @ouototal varchar(50)='' output AS  
 if( @op='Insert') 
   begin 
  /*得到当前的应用程序编号*/
   DECLARE @ApplicationId  INT
   SELECT  @ApplicationId=ApplicationId FROM Mem_Application WHERE ApplicationName=@ApplicationName

     INSERT INTO Mem_UserRight( ApplicationId, UserID, RightsId) 
     VALUES( @ApplicationId, @UserID, @RightsId)
     select @@identity as 'identity'
     set @ouototal=@@identity    
 end
GO
