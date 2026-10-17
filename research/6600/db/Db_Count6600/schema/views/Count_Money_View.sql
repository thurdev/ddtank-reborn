-- VIEW dbo.Count_Money_View (modified 2012-04-21T07:53:24.153)
CREATE VIEW [dbo].[Count_Money_View]
AS
SELECT DISTINCT 
                      TOP 100 PERCENT ApplicationId, SubId, CONVERT(Char(10), BuyDateTime, 120) AS BuyDateTime, DATEPART(hh, BuyDateTime) AS BuyHour, 
                      COUNT(UserId) AS UserCount, SUM(Point) AS PointCount, SUM(NeedMoney) AS NeedMoney, 0 AS id
FROM         dbo.Count_Money
GROUP BY ApplicationId, SubId, CONVERT(Char(10), BuyDateTime, 120), DATEPART(hh, BuyDateTime)
ORDER BY ApplicationId, SubId, CONVERT(Char(10), BuyDateTime, 120), DATEPART(hh, BuyDateTime)


GO
