-- SQL_STORED_PROCEDURE dbo.SP_UsersState_SingleByUserName (modified 2015-01-25T14:04:48.380)
-- =============================================
-- Author:<watson>
-- ALTER  date: <2009-11-24>
-- Description:	<玩家状态信息：透过用户名查询>
-- =============================================
CREATE Procedure [dbo].[SP_UsersState_SingleByUserName]
@UserName Nvarchar(200)
as

select * from db_tank.dbo.Sys_Users_Detail
where UserName=@UserName

GO
