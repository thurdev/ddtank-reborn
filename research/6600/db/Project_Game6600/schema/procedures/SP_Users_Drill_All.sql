-- SQL_STORED_PROCEDURE dbo.SP_Users_Drill_All (modified 2015-01-25T14:04:48.273)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：获取用户信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_Drill_All]
 @UserID int
 AS  
   begin 
     select  * from Sys_User_Drills  
where [UserID] = @UserID --and IsExist = 1
order by [BeadPlace] ASC
   end

GO
