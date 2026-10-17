-- SQL_STORED_PROCEDURE dbo.count_InsertChargeRecord (modified 2012-04-21T07:53:24.763)
--======================================================
--<watson>
--<记录百度玩吧订单信息>
--<2010-01-25>
--======================================================
CREATE  proc count_InsertChargeRecord
@type int,
@order_id varchar(800),
@wanba_oid varchar(800),
@amount varchar(800),
@currency varchar(800),
@result int,
@ddtResult int,
@dateTimes datetime,
@userName varchar(800),
@nickName varchar(800)
as 
begin
declare @res int
set @res=0
   if(@type=0)
   	begin
   	insert db_count.dbo.Count_ChargeRecord(OrderId,WanbaOId,Amount,Currency,WanbaResult,DDTResult,DateTimes,UserName,NickName) values 
		(@order_id,@wanba_oid,@amount,@currency,@result,@ddtResult,@dateTimes,@userName,@nickName) 
   	set @res=@@ROWCOUNT 
	end 
   if(@type=1)
	begin
	update db_count.dbo.Count_ChargeRecord set DDTResult=@ddtResult
	set @res=@@ROWCOUNT 
	end	
return @res
end



GO
