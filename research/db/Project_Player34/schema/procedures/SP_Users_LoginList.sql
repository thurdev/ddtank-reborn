-- SQL_STORED_PROCEDURE dbo.SP_Users_LoginList (modified 2021-06-04T05:18:36.230)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：获取一个登陆的用户信息>
-- =============================================
CREATE Procedure [dbo].[SP_Users_LoginList]
@userName Nvarchar(200)
as
select * from V_Sys_Users_Detail 
where UserName=@userName







GO
