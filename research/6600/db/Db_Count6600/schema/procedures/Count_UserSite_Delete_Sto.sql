-- SQL_STORED_PROCEDURE dbo.Count_UserSite_Delete_Sto (modified 2012-04-21T07:53:24.590)

CREATE procedure Count_UserSite_Delete_Sto
(
@username nvarchar(200)
)
as
begin
declare @returnValue nvarchar(200)
if(@username is null)
return 
select @returnValue =  username from db_count.dbo.Count_UserSite where username = @username
if(@returnValue is null)
return 
else
delete db_count.dbo.Count_UserSite where username=@username
end
GO
