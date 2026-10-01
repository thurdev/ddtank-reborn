-- SQL_STORED_PROCEDURE dbo.SP_Users_UpdatePasswordTwo (modified 2021-06-04T05:18:36.557)


-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：修改用户二次密码>
-- =============================================
CREATE Procedure [dbo].[SP_Users_UpdatePasswordTwo]
@UserID int,
@PasswordTwo Nvarchar(50)

as

  update Sys_Users_Detail set [PasswordTwo] =@PasswordTwo where UserID = @UserID







GO
