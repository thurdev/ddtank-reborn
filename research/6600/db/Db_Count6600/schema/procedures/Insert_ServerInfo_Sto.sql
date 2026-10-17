-- SQL_STORED_PROCEDURE dbo.Insert_ServerInfo_Sto (modified 2012-04-21T07:53:24.950)


create proc Insert_ServerInfo_Sto
@serverName nvarchar(100),
@serverUrl  nvarchar(100)
as
begin
insert serverinfo values(@serverName,@serverUrl)
end



GO
