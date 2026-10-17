-- SQL_STORED_PROCEDURE dbo.Count_AddItemInfo_Sto (modified 2012-04-21T07:53:25.200)
CREATE  proc Count_AddItemInfo_Sto
@Id varchar(200),
@ApplicationID int,
@AgentsID int,
@ChannelsID int,
@Type varchar(200),
@Datetime datetime,
@TemplateID int,
@Reason varchar(200),
@CountI int
as
begin
insert into Count_ItemInfo(Id,ApplicationID,AgentsID,ChannelsID,Type,DateT,TemplateID,Reason,CountI) values(@Id,@ApplicationID,@AgentsID,@ChannelsID,@Type,@Datetime,@TemplateID,@Reason,@CountI)
if(@@error <> 0)
begin
  return 1
end
return 0
end

GO
