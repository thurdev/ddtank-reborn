-- SQL_STORED_PROCEDURE dbo.SP_Users_LimitByUserName (modified 2021-06-04T05:18:36.200)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：获取一条用户信息>
-- =============================================
CREATE Procedure [dbo].[SP_Users_LimitByUserName]
@UserName Nvarchar(200)
as

select * from Sys_Users_Detail
where UserName=@UserName and IsExist = 1








GO
