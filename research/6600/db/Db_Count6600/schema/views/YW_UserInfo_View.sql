-- VIEW dbo.YW_UserInfo_View (modified 2012-04-21T07:53:25.123)
/*--------Author:Jason  Description: YesWan 接口  Date:2009-12-21*/
CREATE VIEW [dbo].[YW_UserInfo_View]
AS
SELECT TOP 10 A.UserID, A.UserName, A.NickName, A.Sex, A.Win, A.Total, A.GP, A.Grade, 
      A.LastDate, A.ActiveIP, A.PasswordTwo, B.ConsortiaName
FROM Db_Tank_Copy.dbo.Sys_Users_Detail A LEFT OUTER JOIN
      Db_Tank_Copy.dbo.Consortia B ON A.ConsortiaID = B.ConsortiaID

GO
