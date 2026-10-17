-- VIEW dbo.Count_Point_View (modified 2012-04-21T07:53:24.233)
/*查询点卷记录
作者：keny
创建日期：2009-11-19
描述：后台查询用户点卷记录
*/
CREATE VIEW [dbo].[Count_Point_View]
AS
SELECT c.id,s.UserName, s.NickName, c.Point, c.Gold, c.MastType, c.SonType, 
      c.PayTime
FROM dbo.Count_SystemPay c INNER JOIN
      Db_Tank_Copy.dbo.Sys_Users_Detail s ON c.PayUserId = s.UserID




GO
