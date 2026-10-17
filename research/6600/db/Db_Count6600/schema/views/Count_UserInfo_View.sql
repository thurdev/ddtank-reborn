-- VIEW dbo.Count_UserInfo_View (modified 2012-04-21T07:53:24.590)
CREATE VIEW [dbo].[Count_UserInfo_View]
AS
SELECT Id, ApplicationId, SubId, RegDateTime, UserId, Sex, ISNULL(UserIp, '') AS UserIp, 
      ISNULL(UserAddress, '') AS UserAddress, ISNULL(UserNet, '') AS UserNet, 
      ISNULL(UserSite, '') AS UserSite, ISNULL(UserName, '') AS UserName, 
      ISNULL(UserOther, '') AS UserOther
FROM dbo.Count_Register



GO
