-- VIEW dbo.ddt_Charge_Money_Site_view (modified 2012-04-21T07:53:24.687)
/*作者：keny
日期：2009-11-23
描述：为每个代理商查询游戏充值记录*/
CREATE VIEW [dbo].[ddt_Charge_Money_Site_view]
AS
SELECT A.chargeId as Id, A.UserName, A.Money, A.[Date], A.CanUse, A.PayWay, 
      A.NeedMoney, B.NickName, A.ChargeID, B.Site, c.AgentsName
FROM Db_Tank.dbo.Charge_Money A LEFT OUTER JOIN
      Db_Tank.dbo.Sys_Users_Detail B ON A.UserName = B.UserName LEFT OUTER JOIN
      db_count.dbo.Count_Site c ON c.site = B.Site




GO
