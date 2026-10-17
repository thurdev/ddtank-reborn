-- VIEW dbo.Ddt_Count_MoneyTenThousand_Empty_view (modified 2011-04-13T00:53:17.700)
-- =========================================================================================
-- Author :  watson
-- Alter date : 2009-10-11
-- Description : 一万点卷空视图
-- =========================================================================================
CREATE VIEW [dbo].[Ddt_Count_MoneyTenThousand_Empty_view]
AS
SELECT 
CAST('' AS int) AS userid,
CAST('' AS nvarchar(200)) AS username,
CAST('' AS nvarchar(50)) AS nickname,
CAST('' AS int) AS money


GO
