-- SQL_STORED_PROCEDURE dbo.SP_Users_Reload (modified 2021-06-04T05:18:36.410)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：用户登陆信息>
-- =============================================
CREATE Procedure [dbo].[SP_Users_Reload]
@ID int
as
select * from V_Sys_Users_Detail
where UserID=@ID  and IsExist = 1 --and [Password] = @passWord








GO
