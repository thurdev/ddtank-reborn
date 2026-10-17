-- VIEW dbo.Count_Shop_View (modified 2012-04-21T07:53:24.530)
CREATE VIEW [dbo].[Count_Shop_View]
AS
SELECT     A.Id, A.Money, A.Gold, A.EnterTime, A.GoodId, B.UserName, B.UserOther
FROM         dbo.Count_Shop AS A LEFT OUTER JOIN
                      dbo.Count_Register AS B ON A.UserId = B.UserId AND A.ApplicationId = B.ApplicationId AND A.SubId = B.SubId


GO
