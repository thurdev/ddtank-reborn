-- SQL_STORED_PROCEDURE dbo.SP_UsersState_SingleByUserID (modified 2015-01-25T14:04:48.383)
-- =============================================
-- Author:<watson>
-- ALTER  date: <2009-11-26>
-- Description:	<玩家状态信息：透过用户ID查询>
-- =============================================
create  Procedure [dbo].[SP_UsersState_SingleByUserID]
@UserId int
as

select * from db_tank.dbo.Sys_Users_Detail
where UserId=@UserId

GO
