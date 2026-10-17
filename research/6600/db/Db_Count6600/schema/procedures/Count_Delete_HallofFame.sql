-- SQL_STORED_PROCEDURE dbo.Count_Delete_HallofFame (modified 2012-04-21T07:53:25.153)
--Author:keny  Date:2010-02-11  Description:删除名人堂15天以外的数据
CREATE proc Count_Delete_HallofFame
as
declare @total int  --存储当前系统存在几天的数据

select @total = count(distinct(DateTime)) from db_count.dbo.Count_HallofFame
if(@total>=15)
	delete db_count.dbo.Count_HallofFame where convert(char(10),[dateTime],120)
	not in (select top 15 convert(char(10),[dateTime],120) from db_count.dbo.Count_HallofFame group by [dateTime] order by [dateTime] desc)
GO
