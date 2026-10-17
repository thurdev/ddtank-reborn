-- SQL_STORED_PROCEDURE dbo.Count_UserSite_Add_Sto (modified 2012-04-21T07:53:24.590)
create procedure Count_UserSite_Add_Sto
(
@username nvarchar(200),
@site nvarchar(200)
)
as
begin
insert db_count.dbo.Count_UserSite(username,site) values(@username,@site)
end

GO
