-- VIEW dbo.Auto_MinuteCount_View (modified 2011-04-13T00:53:16.577)
CREATE  view [dbo].[Auto_MinuteCount_View]
as
SELECT
CAST('' AS int) AS ApplicationId,
CAST('' AS int) AS Client,
CAST('' AS datetime) AS Regdate,
CAST('' AS int) AS Reg,
CAST('' AS int) AS Online,
CAST('' AS int) AS Pay_Man,
CAST(null AS numeric(18, 2)) AS Pay_Money




GO
