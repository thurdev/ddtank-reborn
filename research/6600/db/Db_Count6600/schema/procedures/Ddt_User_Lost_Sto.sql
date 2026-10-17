-- SQL_STORED_PROCEDURE dbo.Ddt_User_Lost_Sto (modified 2012-04-21T07:53:24.780)

CREATE PROCEDURE [dbo].[Ddt_User_Lost_Sto]
@currentdate datetime
AS
BEGIN


declare @startTime varchar(10),@endTime varchar(10)
set @endTime= Convert(Varchar(10),@currentdate,120)
set @startTime=dateadd(day,-30,@endTime)  
select userid into #temp
from (
    select userid, dt =loginmonth+'-01' from Count_UserLoginLog where day1 =1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-02' from Count_UserLoginLog where day2 =1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-03' from Count_UserLoginLog where day3 =1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-04' from Count_UserLoginLog where day4 =1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-05' from Count_UserLoginLog where day5 =1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-06' from Count_UserLoginLog where day6 =1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-07' from Count_UserLoginLog where day7 =1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-08' from Count_UserLoginLog where day8 =1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-09' from Count_UserLoginLog where day9 =1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-10' from Count_UserLoginLog where day10=1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-11' from Count_UserLoginLog where day11=1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-12' from Count_UserLoginLog where day12=1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-13' from Count_UserLoginLog where day13=1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-14' from Count_UserLoginLog where day14=1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-15' from Count_UserLoginLog where day15=1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-16' from Count_UserLoginLog where day16=1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-17' from Count_UserLoginLog where day17=1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-18' from Count_UserLoginLog where day18=1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-19' from Count_UserLoginLog where day19=1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-20' from Count_UserLoginLog where day20=1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-21' from Count_UserLoginLog where day21=1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-22' from Count_UserLoginLog where day22=1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-23' from Count_UserLoginLog where day23=1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-24' from Count_UserLoginLog where day24=1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-25' from Count_UserLoginLog where day25=1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-26' from Count_UserLoginLog where day26=1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-27' from Count_UserLoginLog where day27=1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-28' from Count_UserLoginLog where day28=1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-29' from Count_UserLoginLog where day29=1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-30' from Count_UserLoginLog where day30=1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7) union all
    select userid, dt =loginmonth+'-31' from Count_UserLoginLog where day31=1 and loginmonth>=left(@startTime,7) and loginmonth<=left(@endTime,7)
) as a where dt between @startTime and @endTime
group by userid
having count(1)>=3

declare @result varchar(10)

select top 1 @result=count(1) from #temp a
  left outer join db_tank_copy.dbo.Sys_Users_Detail b
  on a.userid=b.userid
  where b.Grade>=3
  
   print @endTime +'     '+@result

drop table #temp
END

GO
