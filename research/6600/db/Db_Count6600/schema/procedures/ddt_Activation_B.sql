-- SQL_STORED_PROCEDURE dbo.ddt_Activation_B (modified 2012-04-21T07:53:24.247)
CREATE  proc [dbo].[ddt_Activation_B]
@AwardID varchar(8000)
as
begin
select B.Grade,count(B.NickName) as CountName from Db_Tank_Copy.dbo.Active_Number as A Left Join Db_Tank_Copy.dbo.Sys_Users_Detail as B on 
A.UserID=B.UserID where A.AwardID in (select Value from dbo.split(@AwardID,',')) group by B.Grade
end



GO
