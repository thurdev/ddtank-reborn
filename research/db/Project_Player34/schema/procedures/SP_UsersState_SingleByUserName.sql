-- SQL_STORED_PROCEDURE dbo.SP_UsersState_SingleByUserName (modified 2021-06-04T05:18:36.590)



-- =============================================
-- Author:<watson>
-- ALTER  date: <2009-11-24>
-- Description:	<玩家状态信息：透过用户名查询>
-- =============================================
CREATE Procedure [dbo].[SP_UsersState_SingleByUserName]
@UserName Nvarchar(200)
as

select * from dbo.Sys_Users_Detail
where UserName=@UserName







GO
