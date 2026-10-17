-- VIEW dbo.Ddt_Count_Shop_History_View (modified 2011-04-13T00:53:17.700)
--查询用户消费记录  作者：keny  创建日期：2009-11-18  描述：后台查询用户消费记录
CREATE VIEW [dbo].[Ddt_Count_Shop_History_View]
AS
SELECT CAST(0 AS Bigint) AS Id, CAST('' AS Varchar(20)) AS UserName, 
      CAST('' AS Varchar(50)) AS NickName, CAST('2009-01-01' AS DateTime) AS EnterTime, 
      CAST(0 AS Int) AS Money, CAST('' AS Varchar(50)) AS Name, CAST(0 AS Int) 
      AS TemplateID, CAST(0 AS Int) AS counts




GO
