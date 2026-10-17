-- SQL_STORED_PROCEDURE dbo.SP_User_Buff_All (modified 2015-01-25T14:04:48.250)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：获取当前用户的Buff>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_User_Buff_All]
 @UserID int
 AS  
   begin 
     select * from User_Buff  where UserID = @UserID and IsExist = 1
   end

GO
