-- VIEW dbo.Count_User_Detail_View (modified 2012-04-21T07:53:24.560)
CREATE VIEW [dbo].[Count_User_Detail_View]
AS
SELECT     TOP 0 UserID, UserName, NickName, Date, Sex, GP, Gold, Money
FROM         dbo.Ddtc_Users_Detail


GO
