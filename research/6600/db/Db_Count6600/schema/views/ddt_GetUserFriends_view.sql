-- VIEW dbo.ddt_GetUserFriends_view (modified 2011-04-13T00:53:17.700)
-- Author:keny-- Date:2009-12-02  -- Description:为九成代理商提供根据用户名查询好友信息
CREATE VIEW [dbo].[ddt_GetUserFriends_view] AS SELECT CAST('' AS int) AS UserId, CAST('' AS nvarchar(20)) AS UserName, CAST('' AS nvarchar(20)) AS NickName, CAST('' AS int) AS Grade, CAST('' AS nvarchar(50)) AS ConsortiaName



GO
