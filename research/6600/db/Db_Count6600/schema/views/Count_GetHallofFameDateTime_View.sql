-- VIEW dbo.Count_GetHallofFameDateTime_View (modified 2012-04-21T07:53:25.200)
--Author:keny Date:2010-01-20 Description:查询名人堂日期

CREATE VIEW [dbo].[Count_GetHallofFameDateTime_View]
AS
SELECT MainType, MaxType, MinType, DateTime
FROM dbo.Count_HallofFame
GROUP BY MainType, MaxType, MinType, DateTime



GO
