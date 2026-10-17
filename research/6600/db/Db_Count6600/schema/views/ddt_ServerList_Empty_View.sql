-- VIEW dbo.ddt_ServerList_Empty_View (modified 2011-04-13T00:53:17.717)
CREATE VIEW [dbo].[ddt_ServerList_Empty_View]
AS
SELECT 
CAST('' AS int) AS id,
CAST('' AS nvarchar(50)) AS name,
CAST('' AS nvarchar(50)) AS ip,
CAST('' AS int) AS port,
CAST('' AS int) AS state,
CAST('' AS int) AS online,
CAST('' AS int) AS total,
CAST('' AS int) AS room,
CAST('' AS int) AS mustlevel,
CAST('' AS int) AS lowestlevel,
CAST('' AS nvarchar(1000)) AS openmap



GO
