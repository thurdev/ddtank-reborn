-- SQL_STORED_PROCEDURE dbo.Ddt_Tank_NickNameInfo_Sto (modified 2012-04-21T07:53:24.140)
CREATE  PROCEDURE [dbo].[Ddt_Tank_NickNameInfo_Sto]
 @CreateDate nvarchar(50)
as
begin

declare @date datetime
set @date=convert(datetime,@CreateDate)

declare @loginMonth nvarchar(200)
set @loginMonth=''''+convert(nvarchar(7),@date,120)+''''
declare @days nvarchar(200)
set @days='day'+convert(nvarchar(2),day(@date),120)

declare @str_sel nvarchar(2000)
create table #templogin(userid bigint)
set @str_sel='insert into #templogin select userid from Count_UserLoginLog where loginMonth='+@loginMonth+' and '+@days+'=1'
Exec (@str_sel)

select UserName,NickName,[Date],GP,OnlineTime,Grade,Total,Win from db_tank_copy.dbo.sys_users_detail where userid in (
select * from #templogin)

drop table #templogin

end

GO
