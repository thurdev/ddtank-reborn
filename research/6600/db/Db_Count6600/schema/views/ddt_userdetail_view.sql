-- VIEW dbo.ddt_userdetail_view (modified 2012-04-21T07:53:24.967)
CREATE VIEW [dbo].[ddt_userdetail_view]
AS
SELECT     UserID AS id, UserName, NickName, Sex, Gold, Money, LastDate
FROM         Db_Tank.dbo.Sys_Users_Detail


GO
