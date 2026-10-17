-- SQL_STORED_PROCEDURE dbo.Ddt_Count_Job_Operate_Sto (modified 2012-04-21T07:53:25.200)
--作者:andy	--日期:2009-07-08	--描述：插入或者修改公告记录
CREATE  PROCEDURE [dbo].[Ddt_Count_Job_Operate_Sto]  
 @jobid int, 
 @jobname varchar(100), 
 @runtime int, 
 @begindate DateTime, 
 @enddate DateTime, 
 @begintime varchar(50), 
 @endtime varchar(50), 
 @jobcontent varchar(500),  
 @op varchar(50), 
 @ouototal varchar(50)='' output AS  
 if( @op='Insert') 
   begin 
     select @jobid=max(isnull(jobid,0))+1 from Count_Job
     INSERT INTO Count_Job(jobid, jobname, runtime, begindate, enddate, begintime, endtime, jobcontent) 
     VALUES(@jobid, @jobname, @runtime, @begindate, @enddate, @begintime, @endtime, @jobcontent)
     select @@identity as 'identity'
     set @ouototal=@@identity    
 end 
  
 if( @op!='Insert')
   begin 
     UPDATE Count_Job Set jobid=@jobid, jobname=@jobname, runtime=@runtime, begindate=@begindate, enddate=@enddate, begintime=@begintime, endtime=@endtime, jobcontent=@jobcontent WHERE (jobid =@op)
     set @ouototal=@op   	
   end

GO
