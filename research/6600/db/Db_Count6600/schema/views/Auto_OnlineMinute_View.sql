-- VIEW dbo.Auto_OnlineMinute_View (modified 2011-04-13T00:53:16.577)
create   view [dbo].[Auto_OnlineMinute_View]
as
SELECT
CAST('' AS int) AS ApplicationId,
CAST('' AS int) AS Client,
CAST('' AS datetime) AS Regdate,
CAST('' AS datetime) AS HourMinute,
CAST('' AS int) AS Reg,
CAST('' AS int) AS Online,
CAST('' AS int) AS Pay_Man,
CAST(null AS numeric(18, 2)) AS Pay_Money




GO
