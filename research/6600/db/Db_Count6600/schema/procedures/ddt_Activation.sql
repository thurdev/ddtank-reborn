-- SQL_STORED_PROCEDURE dbo.ddt_Activation (modified 2012-04-21T07:53:24.153)
CREATE  proc ddt_Activation
@AwardID varchar(5000)
as
begin
select A.AwardID,A.PullDown,A.GetDate,B.UserID,B.Grade,B.UserName,B.nickName from Db_Tank_Copy.dbo.Active_Number as A Left Join Db_Tank_Copy.dbo.Sys_Users_Detail as B on 
A.UserID=B.UserID where A.AwardID in (select Value from dbo.split(@AwardID,','))
end

GO
