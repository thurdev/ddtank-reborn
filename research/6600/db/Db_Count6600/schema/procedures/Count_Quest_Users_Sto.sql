-- SQL_STORED_PROCEDURE dbo.Count_Quest_Users_Sto (modified 2012-04-21T07:53:25.153)
--作者：watson
--日期：2009-11-09
--说明：查询用户任务信息
create PROCEDURE Count_Quest_Users_Sto
as
select a.userid,b.username,b.nickname,a.questid,a.iscomplete,a.completeddate,a.isexist,a.repeatfinish into #temp1
from db_tank_copy.dbo.questData a 
left join db_tank_copy.dbo.sys_users_detail b 
on a.userid=b.userid

select c.userid,c.username,c.nickname,c.questid,d.title,c.iscomplete,c.completeddate,c.isexist,c.repeatfinish
into #temp2
 from #temp1 c left join db_tank_copy.dbo.quest d 
on c.questid=d.questid

select * from #temp2

drop table #temp1
drop table #temp2


GO
