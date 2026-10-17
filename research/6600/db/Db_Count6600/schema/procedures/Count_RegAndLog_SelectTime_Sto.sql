-- SQL_STORED_PROCEDURE dbo.Count_RegAndLog_SelectTime_Sto (modified 2012-04-21T07:53:24.717)
CREATE procedure Count_RegAndLog_SelectTime_Sto
(
@site nvarchar(200)
)
as
begin
if(@site='')
  begin
    SELECT distinct Date from db_count.dbo.Count_RegAndLog_Site order by date
  end
else
  begin
     SELECT distinct Date from db_count.dbo.Count_RegAndLog_Site where site='A' order by date
  end
end

GO
