-- SQL_STORED_PROCEDURE dbo.Count_AddPaymentInfo_Sto (modified 2012-04-21T07:53:25.170)
--游戏ID，代理商id,频道，时间，用户名，是否到账，点券，付费方式，RMB
CREATE  proc Count_AddPaymentInfo_Sto
@ApplicationID int,
@AgentsID int,
@ChannelsID int,
@Datetime datetime,
@Username varchar(200),
@IsCanUsed bit,
@Money int,
@Payway varchar(50),
@NeedMoney decimal
as
begin
insert into Count_PaymentInfo(ApplicationID,AgentsID,ChannelsID,DateT,Username,IsCanUsed,Money,Payway,NeedMoney) values(@ApplicationID,@AgentsID,@ChannelsID,@Datetime,@Username,@IsCanUsed,@Money,@Payway,@NeedMoney)
if(@@error <> 0)
begin
  return 1
end
return 0
end

GO
