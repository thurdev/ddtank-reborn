-- VIEW dbo.Count_Quest_Users_view (modified 2011-04-13T00:53:16.607)
create view [dbo].[Count_Quest_Users_view] 
as
SELECT 
CAST('' AS int) AS userid,
CAST('' AS nvarchar(200)) AS username,
CAST('' AS nvarchar(50)) AS nickname,
CAST('' AS int) AS questid,
CAST('' AS nvarchar(300)) AS title,
CAST('' AS bit) AS iscomplete,
CAST('' AS datetime) AS completeddate,
CAST('' AS int) AS isexist,
CAST('' AS int) AS repeatfinish


GO
