-- VIEW dbo.Ddt_Fight_Rate_View (modified 2012-04-21T07:53:24.747)
CREATE VIEW [dbo].[Ddt_Fight_Rate_View]
AS
--创建人:Andy	--创建时间:2009-08-20	--说明:战斗换装表
SELECT a.[ID],a.[ServerID],a.[Rate],a.[BeginDay],a.[EndDay],a.[BeginTime],a.[EndTime],a.[BoyTemplateID],a.[GirlTemplateID],a.[SelfCue],a.[EnemyCue],a.[Name],b.name as ServerName
  FROM [Db_Tank].[dbo].[Fight_Rate] a left join [Db_Tank].[dbo].Server_List b
on(a.serverid=b.id)


GO
