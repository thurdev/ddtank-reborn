-- VIEW dbo.Ddt_Tank_Experience_Rate_Show_View (modified 2011-04-13T00:53:18.750)

CREATE VIEW [dbo].[Ddt_Tank_Experience_Rate_Show_View]
AS
SELECT 
CAST('' AS int) AS ServerID,
CAST('' AS nvarchar(50)) AS Name,
CAST('' AS decimal(5, 1)) AS Rate,
CAST('' AS DateTime) AS BeginDay,
CAST('' AS DateTime) AS EndDay,
CAST('' AS DateTime) AS BeginTime,
CAST('' AS DateTime) AS EndTime,
CAST('' AS int) AS Type


GO
