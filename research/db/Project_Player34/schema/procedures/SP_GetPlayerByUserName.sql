-- SQL_STORED_PROCEDURE dbo.SP_GetPlayerByUserName (modified 2021-06-04T05:18:35.440)







-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：获取用户信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_GetPlayerByUserName]
 @UserName nvarchar(30)
 AS  
   begin 
     select  * from Sys_Users_Detail  
where [UserName] = @UserName --and IsExist = 1
   end











GO
