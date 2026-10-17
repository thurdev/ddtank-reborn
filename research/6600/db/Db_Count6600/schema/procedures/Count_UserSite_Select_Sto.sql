-- SQL_STORED_PROCEDURE dbo.Count_UserSite_Select_Sto (modified 2012-04-21T07:53:24.733)

CREATE procedure Count_UserSite_Select_Sto
(
@username nvarchar(200)
)
as
begin
select * from db_count.dbo.Count_UserSite_View where username=@username
end
GO
