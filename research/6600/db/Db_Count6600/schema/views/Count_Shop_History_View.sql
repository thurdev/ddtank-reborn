-- VIEW dbo.Count_Shop_History_View (modified 2012-04-21T07:53:24.497)
--查询用户消费记录  作者：keny  创建日期：2009-11-18  描述：后台查询用户消费记录 修改人:keny 修改日期：2009-12-07 修改描述：新增商品ID列
CREATE VIEW [dbo].[Count_Shop_History_View]
AS
SELECT s.Id, c.UserName, c.NickName, s.EnterTime, s.Money, d.TemplateID,d.Name, (LEN(s.GoodId) 
      - LEN(REPLACE(s.GoodId + ',', CAST(d.TemplateID AS Varchar(10)) + ',', ''))) 
      / LEN(CAST(d.TemplateID AS Varchar(10))) AS Quality
FROM Db_Tank_Copy.dbo.Sys_Users_Detail c INNER JOIN
      dbo.Count_Shop s ON c.UserID = s.UserId INNER JOIN
      dbo.Ddtc_Shop_Goods d ON s.GoodId = CAST(d.TemplateID AS varchar(200))
WHERE (s.Money > 0)


GO
