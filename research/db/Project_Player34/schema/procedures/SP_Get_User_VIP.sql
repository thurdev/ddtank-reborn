-- SQL_STORED_PROCEDURE dbo.SP_Get_User_VIP (modified 2021-06-04T05:18:35.397)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<炼化表:显示全部炼化>
-- =============================================
CREATE Procedure [dbo].[SP_Get_User_VIP]
@UserID int
as
select * from Sys_VIP_Info where UserID = @UserID










GO
