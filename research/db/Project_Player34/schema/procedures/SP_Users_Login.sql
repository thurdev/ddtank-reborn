-- SQL_STORED_PROCEDURE dbo.SP_Users_Login (modified 2021-06-04T05:18:36.220)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：用户登陆信息>
-- =============================================
CREATE Procedure [dbo].[SP_Users_Login]
@userName Nvarchar(200),
@passWord Nvarchar(200)
as
select * from V_Sys_Users_Detail
where UserName=@userName and [Password] = @passWord and IsExist = 1







GO
