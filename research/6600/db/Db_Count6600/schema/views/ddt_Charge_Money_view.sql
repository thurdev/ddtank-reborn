-- VIEW dbo.ddt_Charge_Money_view (modified 2012-04-21T07:53:24.687)
CREATE VIEW [dbo].[ddt_Charge_Money_view]
AS
SELECT      A.chargeId AS Id, A.UserName, A.Money, A.Date, A.CanUse, A.PayWay, A.NeedMoney, B.NickName,A.ChargeID
FROM         Db_Tank.dbo.Charge_Money AS A LEFT OUTER JOIN
                      Db_Tank.dbo.Sys_Users_Detail AS B ON A.UserName = B.UserName





GO
