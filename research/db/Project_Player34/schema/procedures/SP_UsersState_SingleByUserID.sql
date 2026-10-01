-- SQL_STORED_PROCEDURE dbo.SP_UsersState_SingleByUserID (modified 2021-06-04T05:18:36.580)


-- =============================================
-- Author:<watson>
-- ALTER  date: <2009-11-26>
-- Description:	<玩家状态信息：透过用户ID查询>
-- =============================================
CREATE  Procedure [dbo].[SP_UsersState_SingleByUserID]
@UserId int
as

select * from dbo.Sys_Users_Detail
where UserId=@UserId










GO
