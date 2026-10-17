-- SQL_STORED_PROCEDURE dbo.SP_Users_SingleAllUserID (modified 2015-01-25T14:04:48.810)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：通过ID获取一条信息,包括已禁号的用户>
-- =============================================
CREATE Procedure [dbo].[SP_Users_SingleAllUserID]
@userID int
as
select * from V_Sys_Users_Detail where UserID=@userID

GO
