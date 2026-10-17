-- SQL_STORED_PROCEDURE dbo.SP_UsersState_SingleByUserIDs (modified 2012-04-21T07:53:24.920)
create proc  [dbo].[SP_UsersState_SingleByUserIDs]
@UserId int
as
select UserName,UserID from db_tank.dbo.Sys_Users_Detail
where UserId=@UserId

GO
