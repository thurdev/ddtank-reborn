-- SQL_STORED_PROCEDURE dbo.Ddt_SendHistoryName_List_sto (modified 2012-04-21T07:53:24.543)
create proc Ddt_SendHistoryName_List_sto
@nikename nvarchar(200),
@username nvarchar(200),
@date datetime
as
begin
insert into Count_UserStopHistory_B values(@nikename,@username,@date)
end


GO
