-- SQL_STORED_PROCEDURE dbo.Ddt_Count_Job_Show_Sto (modified 2012-04-21T07:53:25.217)
--作者:andy	--日期:2009-07-08	--描述：按参数（id）查询公告记录
Create  PROCEDURE Ddt_Count_Job_Show_Sto 
@id int
as
select id,jobid,runtime,begindate,enddate,begintime,endtime,jobname,jobcontent from Count_Job where id=@id

GO
