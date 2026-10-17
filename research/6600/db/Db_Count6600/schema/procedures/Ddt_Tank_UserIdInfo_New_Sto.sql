-- SQL_STORED_PROCEDURE dbo.Ddt_Tank_UserIdInfo_New_Sto (modified 2012-04-21T07:53:25.217)






CREATE PROCEDURE [dbo].[Ddt_Tank_UserIdInfo_New_Sto]
 @SearchKey Nvarchar(200),
 @SearchType int--0为用户名 1 为ID 2为昵称
AS 

 	IF @SearchType=0
 		begin
         SELECT TOP 1 UserID,UserName,NickName,Total,Win FROM Db_Tank.Dbo.Sys_Users_Detail with(nolock) 
         Where UserName=@SearchKey
 		END
 	IF @SearchType=1 and ISNUMERIC(@SearchKey)=1
 		BEGIN
 		 SELECT TOP 1 UserID,UserName,NickName,Total,Win FROM Db_Tank.Dbo.Sys_Users_Detail with(nolock) 
		 Where UserID=@SearchKey

 		END
 	IF @SearchType=2
 		begin
         SELECT TOP 1 UserID,UserName,NickName,Total,Win FROM Db_Tank.Dbo.Sys_Users_Detail with(nolock) 
         Where NickName=@SearchKey
 		END	
 		

 

 


 







GO
