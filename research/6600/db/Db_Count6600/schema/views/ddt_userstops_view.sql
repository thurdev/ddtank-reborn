-- VIEW dbo.ddt_userstops_view (modified 2012-04-21T07:53:25.013)
CREATE  view [dbo].[ddt_userstops_view]
as
SELECT  A.UserID AS id, A.UserName, A.NickName, A.IsExist, A.State, A.Sex, A.LastDate,
      A.ForbidReason, A.PasswordTwo,B.UserName as Names, A.ForbidDate
FROM Db_Tank.dbo.Sys_Users_Detail as A left OUTER join Db_Count.dbo.Count_UserNameStop as B on A.NickName=B.UserNick


GO
