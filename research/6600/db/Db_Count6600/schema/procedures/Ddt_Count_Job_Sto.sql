-- SQL_STORED_PROCEDURE dbo.Ddt_Count_Job_Sto (modified 2012-04-21T07:53:25.217)


-- =============================================
-- Author:		<XiaoV>
-- Create date: <2009-07-07>
-- Description:	<生成作业记录>
-- =============================================
CREATE PROCEDURE Ddt_Count_Job_Sto
@jobid int	
AS
BEGIN
/*定义变量*/
Declare @jobname varchar(50)
Declare @runtime int
Declare @begindate datetime
Declare @enddate datetime
Declare @begintime varchar(50)
Declare @endtime varchar(50)
Declare @jobcontent varchar(500)
Declare @NewBeginTime DateTime
Declare @NewEndTime DateTime
/*第一步：删除作业记录*/
delete from Count_JobRecord where jobid=@jobid
/*第二步：生成新作业记录*/
select   @jobname=jobname, @runtime=runtime, @begindate=begindate,@enddate=enddate, @begintime=begintime, @endtime=endtime, @jobcontent=jobcontent 
from  Count_Job	where jobid=@jobid

while @begindate<=@enddate
  begin
     Set @NewBeginTime= Cast((Convert(Varchar(10),@begindate,120)+' '+@begintime) As DateTime)
     Set @NewEndTime= Cast((Convert(Varchar(10),@begindate,120)+' '+@endtime) As DateTime)
    select @NewBeginTime,@NewEndTime
     While @NewBeginTime<=@NewEndTime
           Begin                
             INSERT INTO Count_JobRecord(jobid,jobcontent,jobdatetime)VALUES (@jobid,@jobcontent,@NewBeginTime)
             Set @NewBeginTime= DateAdd(minute,@runtime,@NewBeginTime)      
             select @NewBeginTime        
           End
   set @begindate= DateAdd(Day,1,@begindate)
  end
END

GO
