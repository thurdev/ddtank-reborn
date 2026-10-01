-- SQL_STORED_PROCEDURE dbo.SP_Users_Friends (modified 2021-06-04T05:18:36.100)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：获取用户好友>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_Friends]
@UserID int
AS  
 select * from V_Sys_Users_Friends where UserID = @UserID and IsExist =1








GO
