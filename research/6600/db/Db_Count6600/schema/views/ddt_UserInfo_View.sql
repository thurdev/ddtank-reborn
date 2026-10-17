-- VIEW dbo.ddt_UserInfo_View (modified 2012-04-21T07:53:24.983)
CREATE VIEW [dbo].[ddt_UserInfo_View]
AS
SELECT     UserID AS Id, '1' AS ApplicationId, '3' AS SubId, Date AS RegDateTime, UserID, Sex, ISNULL(ActiveIP, '') AS UserIp, CAST('' AS varchar(100)) 
                      AS UserAddress, CAST('' AS varchar(20)) AS UserNet, CAST('' AS varchar(10)) AS UserSite, ISNULL(UserName, '') AS UserName, ISNULL(NickName, '') 
                      AS UserOther
FROM         Db_Tank.dbo.Sys_Users_Detail


GO
