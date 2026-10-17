-- SQL_STORED_PROCEDURE dbo.Sp_Log_Auto (modified 2012-04-21T07:53:25.217)


-- =============================================
-- Author:		<Xiaov>
-- Create date: <2010-04-06>
-- Description:	<每日自动优化数据>
-- =============================================
CREATE PROCEDURE [dbo].[Sp_Log_Auto]
@begin_date datetime,@end_date datetime,@search_type varchar(10)
as
-- =============================================
-- author:		<xiaov>
-- create date: <2010-04-07>
-- description:	<查询指定时间的汇总数据>
-- =============================================
begin
	set nocount on
	set @end_date=@end_date+1

	if @search_type='minute'  
	begin
--对应生成文件中的table0
		select entertime as regdate,enterhour as hourminute,max(onlines) as reg,max(regs) as online
			,max(pay_mans) as pay_man,max(pay_moneys) as pay_money
		from(
--在线数据、注册数据
			select convert(char(10),entertime,120) as entertime
				, cast(datepart(hh, entertime)+datepart(mi, entertime)/500. as decimal(10,2)) as enterhour
				,max(online) as onlines,sum(reg) as regs,0 as pay_mans,0 as pay_moneys
			from db_logs.dbo.log_server
			where @begin_date<=entertime and @end_date>entertime
			group by  convert(char(10),entertime,120), cast(datepart(hh, entertime)+datepart(mi, entertime)/500. as decimal(10,2))
			union all
--充值数据
			select convert(char(10),date,120)
				, cast(datepart(hh, date)+datepart(mi, date)/500. as decimal(10,2))
				,0,0,count(*),sum(needmoney)
			from db_tank.dbo.charge_money
			where @begin_date<=date and @end_date>date
			group by convert(char(10),date,120), cast(datepart(hh, date)+datepart(mi, date)/500. as decimal(10,2))
		)a group by entertime,enterhour
		union all
		select '2000-01-01','10',0,0,0,0
	end
	else if @search_type='day'
	begin
--查询点卷金币库存
--对应生成文件中的table0
		select * from db_logs.dbo.log_collectday
		where currentdate>=@begin_date and currentdate<@end_date
		union all 
		select '2000-01-01',0,0
              
--查询活跃用户与登陆数据
--对应生成文件中的table1
		select * from db_logs.dbo.log_userday
		where currentdate>=@begin_date and currentdate<@end_date
		union all
		select '2000-01-01',0,0
            
--查询每日五分钟线
--对应生成文件中的table2
		select * from db_logs.dbo.log_collectminute
		where regdate>=@begin_date and regdate<@end_date
		union all
		select '2000-01-01',0.00,0,0,0,0
	end
end





GO
