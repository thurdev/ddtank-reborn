-- VIEW dbo.Count_RegAndLog_View (modified 2012-04-21T07:53:24.450)
CREATE view [dbo].[Count_RegAndLog_View]
as
select r.*,s.AgentsName from db_count.dbo.Count_RegAndLog_Site as r,db_count.dbo.Count_site as s where r.site=s.site


GO
