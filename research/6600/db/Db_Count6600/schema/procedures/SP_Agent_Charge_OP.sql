-- SQL_STORED_PROCEDURE dbo.SP_Agent_Charge_OP (modified 2012-04-21T07:53:24.687)


--作者:Andy	--日期:2010-01-21	--描述：代理商中转订单接口，增加订单，修改订单
CREATE  PROCEDURE [dbo].[SP_Agent_Charge_OP]
@type Int,
@ChargeID Varchar(100),
@UserName NVarchar(200),
@Money Int,
@Date DateTime,
@CanUse Int,
@PayWay NVarchar(50),
@NickName NVarchar(200),
@Reason NVarchar(100),
@Result int output
AS  
BEGIN 
if (@type=1)
	begin
		insert into Agent_Charge(ChargeID, UserName, Money, Date, CanUse, PayWay, NickName, Reason)
			values(@ChargeID,@UserName,@Money,@Date,@CanUse,@PayWay,@NickName,@Reason)
		set @Result=@@ROWCOUNT 
	end
else if (@type=2)
	begin
 		select * from Agent_Charge where ChargeID=@ChargeID
		set @Result=@@ROWCOUNT 
	end
else if (@type=3)
	begin
 		select * from Agent_Charge where CanUse=@CanUse
		set @Result=@@ROWCOUNT 
	end
else if (@type=4)
	begin
 		update Agent_Charge set CanUse=@CanUse where ChargeID=@ChargeID
		set @Result=@@ROWCOUNT 
	end
return @Result
END




GO
