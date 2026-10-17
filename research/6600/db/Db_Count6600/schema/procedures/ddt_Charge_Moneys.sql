-- SQL_STORED_PROCEDURE dbo.ddt_Charge_Moneys (modified 2012-04-21T07:53:25.123)
CREATE        proc ddt_Charge_Moneys
@startDate datetime,
@endDate datetime,
@username varchar(50)
as
begin
if(@username is null or @username='')
   begin
	select * into #temp
 	from Db_Tank_Copy.dbo.Charge_Money  where date>=@startDate and date<=@endDate

	select UserName,sum(money) as Moneys,sum(needmoney) as needmoneys,min(date) as minDate,max(date) as maxDate 
	into #temp2 from #temp group by UserName
        
      select identity(int,1,1) as Id,* into #temp1 from #temp2
    
            
  
        select  A.Id,A.username,A.moneys,A.minDate,A.maxDate,B.LastDate from #temp1 as A 
	left join Db_Tank_Copy.dbo.Sys_Users_Detail as B on A.username=B.username
	
   end
else
   begin
	select * into #temp3
 	from Db_Tank_Copy.dbo.Charge_Money  where username=@username 

        select UserName,sum(money) as Moneys,sum(needmoney) as needmoneys,min(date) as minDate,max(date) as maxDate 
	into #temp4 from #temp3 group by UserName

        select identity(int,1,1) as Id,* into #temp5 from #temp4          

	select A.Id,A.username,A.moneys,A.minDate,A.maxDate,B.LastDate from #temp5 as A 
        left join Db_Tank_Copy.dbo.Sys_Users_Detail as B on A.username=B.username

   end



end

GO
