-- VIEW dbo.Reg_MinuteCount_View (modified 2011-04-13T00:53:18.890)
create   view [dbo].[Reg_MinuteCount_View]
as
SELECT
CAST('' AS int) AS ApplicationId,
CAST('' AS int) AS Client,
CAST('' AS varchar(50)) AS Regdate,
CAST('' AS int) AS Reg,
CAST('' AS int) AS Online,
CAST('' AS int) AS Pay_Man,
CAST(null AS numeric(18, 2)) AS Pay_Money


GO
