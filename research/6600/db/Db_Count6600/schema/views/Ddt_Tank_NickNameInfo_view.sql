-- VIEW dbo.Ddt_Tank_NickNameInfo_view (modified 2012-04-21T07:53:24.810)
----------Author:Jason  Description: 上海银橙接口  Date:2009-12-15
CREATE  view [dbo].[Ddt_Tank_NickNameInfo_view]
as
 select top 0 UserName,NickName,[Date],GP,OnlineTime,Grade,Total,Win  FROM Db_Tank.Dbo.Sys_Users_Detail 






GO
