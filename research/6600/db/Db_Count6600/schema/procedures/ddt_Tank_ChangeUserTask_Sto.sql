-- SQL_STORED_PROCEDURE dbo.ddt_Tank_ChangeUserTask_Sto (modified 2012-04-21T07:53:24.920)

CREATE proc [dbo].[ddt_Tank_ChangeUserTask_Sto]

@updateType int,
@updateParameters nvarchar(50),
@returnValue bigint output

--@updateType 1表示为用ID修改;2表示为用昵称修改;
as
declare @AnswerSite int,@userId int
set @AnswerSite = -1
set @userId = -1
--如果所有为空则返回
if(@updateType is null and @updateParameters is null)
return

--按ID进行修改
if(@updateType=1)
begin
select @userId = userId from db_tank.dbo.sys_users_detail where userid = @updateParameters;
if(@userId=-1)
return 2
else
begin
select @AnswerSite = AnswerSite from db_tank.dbo.sys_users_detail where userid = @updateParameters;
if(@AnswerSite!=-1 and @AnswerSite!=99)
begin
update db_tank.dbo.sys_users_detail set AnswerSite = 99  where userid = @updateParameters;
return 0
end
else
return 1
end
end

--按昵称来修改
if(@updateType=2)
begin
select @userId = userId from db_tank.dbo.sys_users_detail where nickname = @updateParameters;
print @userid
if(@userId=-1)
return 2
else
begin
select @AnswerSite = AnswerSite from db_tank.dbo.sys_users_detail where nickname = @updateParameters;
if(@AnswerSite!=-1 and @AnswerSite!=99)
begin
update db_tank.dbo.sys_users_detail set AnswerSite = 99  where nickname = @updateParameters;
return 0
end
else 
return 1
end
end
GO
