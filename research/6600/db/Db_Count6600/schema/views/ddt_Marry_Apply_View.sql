-- VIEW dbo.ddt_Marry_Apply_View (modified 2012-04-21T07:53:24.780)
/*Author：keny         Date：2009-11-30       Description：求婚信息查询
*/
CREATE VIEW [dbo].[ddt_Marry_Apply_View]
AS
SELECT TOP 100 PERCENT m.ID, m.ApplyUserName,m.ApplyResult, m.ApplyDate, 
      s.NickName AS UserName, m.ApplyType, m.isExist, m.isDeal
FROM Db_Tank_Copy.dbo.Marry_Apply m INNER JOIN
      Db_Tank_Copy.dbo.Sys_Users_Detail s ON m.UserID = s.UserID
ORDER BY m.ID DESC




GO
