-- VIEW dbo.Count_ShopPoint_View (modified 2012-04-21T07:53:24.543)
CREATE VIEW [dbo].[Count_ShopPoint_View]
AS
SELECT DISTINCT  TOP 100 PERCENT ApplicationId, SubId, CONVERT(Char(10), EnterTime, 120) AS EnterDateTime, DATEPART(hh, EnterTime) AS EnterHour, 
                      COUNT(UserId) AS UserCount, SUM(Moneys) AS PointCount, 0 AS id
FROM         dbo.Log_Money
WHERE     (Moneys > 0)
GROUP BY ApplicationId, SubId, CONVERT(Char(10), EnterTime, 120), DATEPART(hh, EnterTime)
ORDER BY ApplicationId, SubId, EnterDateTime, EnterHour


GO
