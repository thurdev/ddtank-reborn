-- VIEW dbo.Count_Application_ServerMax_View (modified 2012-04-21T07:53:25.200)
CREATE VIEW [dbo].[Count_Application_ServerMax_View]
AS
SELECT TOP 100 PERCENT 0 AS id, ApplicationId, SubId, LineId, CONVERT(Char(10), 
      DateTime, 120) AS PlayDateTime, DATEPART(hh, DateTime) AS DateHour, 
      MAX(UserCount) AS userCount, MAX(GameCount) AS GameCount
FROM dbo.Count_Application_Server
GROUP BY ApplicationId, SubId, LineId, CONVERT(Char(10), DateTime, 120), DATEPART(hh, 
      DateTime)
ORDER BY ApplicationId, SubId, LineId, CONVERT(Char(10), DateTime, 120), DATEPART(hh, 
      DateTime)


GO
