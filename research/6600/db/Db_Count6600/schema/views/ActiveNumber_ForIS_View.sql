-- VIEW dbo.ActiveNumber_ForIS_View (modified 2012-04-21T07:53:25.170)
-- =============================================
-- Author:		<Andy>
-- Create date: <2009-11-19>
-- Description:	<is代理商查询激活码使用>
-- =============================================
CREATE view [dbo].[ActiveNumber_ForIS_View]
as
SELECT top 0 a.AwardID,a.ActiveID,a.PullDown,a.GetDate,a.UserID,a.Mark,b.UserName,b.NickName
		FROM db_tank..Active_Number a left join db_tank..sys_users_detail b
		on(a.UserID=b.UserID) 


GO
