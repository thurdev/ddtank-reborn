-- SQL_STORED_PROCEDURE dbo.SP_ActiveNumber_ForIS (modified 2012-04-21T07:53:24.263)

-- =============================================
-- Author:		<Andy>
-- Create date: <2009-11-19>
-- Description:	<is代理商查询激活码使用>
-- =============================================
CREATE PROCEDURE SP_ActiveNumber_ForIS
@str varchar(50),
@type int,
@activeid int,
@pullDown int
AS
Begin
	if (@type=1)
	begin 
		SELECT a.AwardID,a.ActiveID,a.PullDown,a.GetDate,a.UserID,a.Mark,b.UserName,b.NickName
		FROM db_tank..Active_Number a with(nolock) left join db_tank..sys_users_detail b with(nolock)
		on(a.UserID=b.UserID) 
		where a.getdate>=@str and a.getdate<=dateadd(day,1,@str)
	end
	else
	begin
		SELECT a.AwardID,a.ActiveID,a.PullDown,a.GetDate,a.UserID,a.Mark,b.UserName,b.NickName
		FROM db_tank..Active_Number a with(nolock)  left join db_tank..sys_users_detail b with(nolock)
		on(a.UserID=b.UserID) where username=@str
	end
End
GO
