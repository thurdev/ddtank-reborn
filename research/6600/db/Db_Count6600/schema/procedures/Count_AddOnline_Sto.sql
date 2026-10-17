-- SQL_STORED_PROCEDURE dbo.Count_AddOnline_Sto (modified 2012-04-21T07:53:25.153)
CREATE proc Count_AddOnline_Sto
@ApplicationID int,
@AgentsID int,
@ChannelsID int,
@Datetime datetime,
@SumOnline int,
@SumReg int
as
begin
insert into Count_OnlineInfo(ApplicationID,AgentsID,ChannelsID,Date,SumOnline,SumReg) values(@ApplicationID,@AgentsID,@ChannelsID,@Datetime,@SumOnline,@SumReg)
if(@@error <> 0)
begin
  return 1
end
return 0
end

GO
