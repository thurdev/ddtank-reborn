-- VIEW dbo.Ddt_User_ChagerTop_view (modified 2012-04-21T07:53:24.840)
CREATE VIEW [dbo].[Ddt_User_ChagerTop_view]
AS
SELECT TOP 500 u.UserID AS Id, MAX(u.NickName) AS NickName, c.UserName as username, 
      SUM(c.Money) AS moneys, SUM(c.NeedMoney) AS NeedMoney,
          (SELECT MIN(date)
         FROM db_tank_copy.dbo.charge_money AS a
         WHERE a.username = u.username) AS minDate,
          (SELECT MAX(date)
         FROM db_tank_copy.dbo.charge_money AS b
         WHERE b.username = u.username) AS maxDate,
          (SELECT COUNT(username)
         FROM db_tank_copy.dbo.charge_money AS d
         WHERE d.username = u.username) AS Counts, u.LastDate
FROM Db_Tank_Copy.dbo.Charge_Money c INNER JOIN
      Db_Tank_Copy.dbo.Sys_Users_Detail u ON c.UserName = u.UserName
GROUP BY c.UserName, u.LastDate, u.UserID, u.UserName
ORDER BY moneys DESC



GO
