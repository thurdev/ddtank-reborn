-- SQL_STORED_PROCEDURE dbo.Ddtc_AutoAgents_Sto (modified 2012-04-21T07:53:24.513)
--日期：2009-11-19
--作者：watson
--说明：自动存储过程：将当天注册的人数自动存入表，并区分代理商玩家
--参数：代理商编码,格式：A,B,C,D
CREATE procedure Ddtc_AutoAgents_Sto
(
@AgentsSite nvarchar(800)  --代理商编码,格式：A,B,C,D
)
as
Begin  --存储过程开始

--分割出代理商
Create Table #TempAgentsSite([id] int identity(1,1),[value] varchar(8000))
Insert Into #TempAgentsSite(value) select value From db_count.dbo.Split(@AgentsSite,',')
declare @AgentsTotal int --代理商数量
select @AgentsTotal=count(*) from #tempAgentsSite

--逐家代理扫描当天注册人数+登录人数
declare @i int
set @i=1
while(@i<(@AgentsTotal+1))
begin --while循环开始
	declare @site nvarchar(100)
	select @site=value from #TempAgentsSite where id=@i
	--时间范围：昨天一天
	declare @minDate datetime 
	declare @maxDate datetime
	set @minDate=convert(varchar(10),getdate()-1,120)
	set @maxDate=convert(varchar(10),getdate(),120)

	declare @regCount int --当天A代理商玩家注册数量
	declare @ValidReg int --当天A代理商玩家有效注册数量
	declare @InvalidReg int --当天A代理商玩家无效注册数量
	declare @logCount int --当天A代理商玩家登录数量

	select @regCount=count(*) from db_tank_copy.dbo.sys_users_detail where date>=@minDate and date<@maxDate and site='A'
        select @ValidReg=count(*) from db_tank_copy.dbo.sys_users_detail where date>=@minDate and date<@maxDate and site='A' and nickname!=''
	select @InvalidReg=count(*) from db_tank_copy.dbo.sys_users_detail where date>=@minDate and date<@maxDate and site='A' and nickname=''
	select @logCount=count(*) from db_tank_copy.dbo.sys_users_detail where lastdate>=@minDate and lastdate<@maxDate and site='A'
	--select  @minDate,@maxDate,@regCount,@logCount
	declare @str varchar(5000)
	set @str='select count(*) from db_count.dbo.Count_UserLoginLog where loginmonth='''+convert(varchar(7),@minDate,120)+''''+' and day'+convert(varchar(2),day(@minDate),120)+'=''1'''
	--print @str
	create table #Temp(total int)
	insert into #Temp(total) Exec (@str)
	select @logCount=a.total from #temp a
	drop table #temp
	--select  @minDate,@maxDate,@regCount,@logCount

	--插入 @minDate,@regCount,@logCount,site
	insert into db_count.dbo.Count_RegAndLog_Site VALUES(@minDate,@regCount,@ValidReg,@InvalidReg,@logCount,@site)
	set @i=@i+1
end  --while循环结束

drop table #TempAgentsSite

End  --存储过程结束



GO
