-- VIEW dbo.Count_UserWeek_View (modified 2011-04-13T00:53:16.640)
CREATE VIEW [dbo].[Count_UserWeek_View]
AS
SELECT     GETDATE() AS BeginDate, GETDATE() AS EndDate, 0 AS Logins


GO
