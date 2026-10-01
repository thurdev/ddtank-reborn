-- SQL_STORED_PROCEDURE dbo.SP_Users_SingleByUserID (modified 2021-06-04T05:18:36.500)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：通过ID获取一条信息>
-- =============================================
CREATE Procedure [dbo].[SP_Users_SingleByUserID]
@userID int
as
select * from V_Sys_Users_Detail
where UserID=@userID and IsExist = 1








GO
