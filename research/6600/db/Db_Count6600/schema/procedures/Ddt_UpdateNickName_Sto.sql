-- SQL_STORED_PROCEDURE dbo.Ddt_UpdateNickName_Sto (modified 2012-04-21T07:53:24.450)
CREATE  procedure Ddt_UpdateNickName_Sto
@oldNickName varchar(50),
@newNickName varchar(50),
@result int output
as
declare @temp int
set @result=0
--判断输入的数据是否有效
if(@oldNickName is null or @newNickName is null or @oldNickName='' or @newNickName='')
begin
	--result==-1为输入变量出错
	set @result=-1
end
if(@result!=-1)
begin
	select @temp=count(*) from DB_Tank..sys_users_detail with(nolock) where nickname=@oldNickName

	if(@temp>0)
	begin
		update DB_Tank..sys_users_detail set nickname=@newNickName where nickname=@oldNickName
		set @result=@@ROWCOUNT
	end
	else
	begin
		set @result=0
	end
end

GO
