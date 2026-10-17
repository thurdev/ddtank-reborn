-- VIEW dbo.Mem_Application_User (modified 2012-04-21T07:54:31.123)
CREATE VIEW dbo.Mem_Application_User
AS
SELECT A.ApplicationId, A.ApplicationName, B.UserName, B.UserId, 
      A.LowerApplicationName
FROM dbo.Mem_Application A LEFT OUTER JOIN
      dbo.Mem_Users B ON A.ApplicationId = B.ApplicationId

GO
