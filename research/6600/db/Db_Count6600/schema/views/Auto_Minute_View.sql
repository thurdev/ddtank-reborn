-- VIEW dbo.Auto_Minute_View (modified 2011-04-13T00:53:16.577)

-- =============================================
-- Author:	<andy>
-- Create date: <2009-12-19>
-- Description:	<整合在线注册付费数据——视图>
-- =============================================
CREATE view [dbo].[Auto_Minute_View]
as
SELECT
CAST('' AS int) AS ApplicationId,
CAST('' AS int) AS Client,
CAST('' AS datetime) AS Regdate,
CAST(null AS numeric(18, 2)) AS HourMinute,
CAST('' AS int) AS Reg,
CAST('' AS int) AS Online,
CAST('' AS int) AS Pay_Man,
CAST(null AS numeric(18, 2)) AS Pay_Money



GO
