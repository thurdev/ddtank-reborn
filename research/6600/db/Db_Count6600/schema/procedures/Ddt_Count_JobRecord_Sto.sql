-- SQL_STORED_PROCEDURE dbo.Ddt_Count_JobRecord_Sto (modified 2012-04-21T07:53:25.217)

CREATE PROCEDURE [dbo].[Ddt_Count_JobRecord_Sto]
@min int
AS
select id,jobid,jobcontent,jobdatetime from Count_JobRecord where DATEDIFF(minute, getdate() ,jobdatetime)<=@min and DATEDIFF(minute, getdate(), jobdatetime)>=0
delete from Count_JobRecord where DATEDIFF(minute, getdate() ,jobdatetime)<=@min and DATEDIFF(minute, getdate(), jobdatetime)>=0

GO
