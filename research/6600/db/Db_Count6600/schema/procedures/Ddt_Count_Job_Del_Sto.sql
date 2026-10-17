-- SQL_STORED_PROCEDURE dbo.Ddt_Count_Job_Del_Sto (modified 2012-04-21T07:53:25.247)
--作者:andy	--日期:2009-07-08	--描述：删除公告记录
CREATE  PROCEDURE Ddt_Count_Job_Del_Sto  
 @id int
as
Begin
if(@id!=0)
begin
delete from Count_Job where jobid=@id
end
delete from Count_JobRecord where jobid=@id
End

GO
