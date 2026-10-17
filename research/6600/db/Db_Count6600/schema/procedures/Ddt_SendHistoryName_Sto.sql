-- SQL_STORED_PROCEDURE dbo.Ddt_SendHistoryName_Sto (modified 2012-04-21T07:53:25.200)
CREATE  proc Ddt_SendHistoryName_Sto
@UserNick nvarchar(100),
@UserName nvarchar(100),
@Times nvarchar(50)
as
declare @result int
begin
select @result=count(*) from  Db_Count.dbo.Count_UserNameStop where UserNick=@UserNick
if(@result<>0)
delete Db_Count.dbo.Count_UserNameStop where UserNick=@UserNick
insert  Db_Count.dbo.Count_UserNameStop select @UserNick,@UserName,@Times
end

GO
