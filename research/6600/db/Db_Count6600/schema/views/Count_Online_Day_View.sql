-- VIEW dbo.Count_Online_Day_View (modified 2011-04-13T00:53:16.607)
create view [dbo].[Count_Online_Day_View]
as
select   CAST('2008-01-01' AS DateTime) AS RegDay,CAST('' as int) as Total


GO
