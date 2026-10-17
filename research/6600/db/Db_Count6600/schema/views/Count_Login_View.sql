-- VIEW dbo.Count_Login_View (modified 2011-04-13T00:53:16.590)
CREATE VIEW [dbo].[Count_Login_View]
AS
SELECT 0 AS SubId, CAST('2008-01-01' AS DateTime) AS LoginDateTime, CAST(0 AS Bit) 
      AS IsSex, '地址' AS OwnAddress, '网络' AS OwnNet, '上网地点' AS OnSite, 0 AS UserId, 'IP地址' AS IpAddress, 
      '用户名' AS UserName, '昵称' AS UserOther



GO
