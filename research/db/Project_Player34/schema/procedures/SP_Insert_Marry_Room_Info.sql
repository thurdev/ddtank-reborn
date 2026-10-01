-- SQL_STORED_PROCEDURE dbo.SP_Insert_Marry_Room_Info (modified 2021-06-04T05:18:35.487)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<结婚信息：创建一个结婚房间>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Marry_Room_Info] 
@ID int output,
@Name nvarchar(50),
@PlayerID int,
@PlayerName nvarchar(50),
@GroomID int,
@GroomName nvarchar(50),
@BrideID int,
@BrideName nvarchar(50),
@Pwd nvarchar(15),
@AvailTime int,
@MaxCount int,
@GuestInvite bit,
@MapIndex int,
@BeginTime datetime,
@BreakTime datetime,
@RoomIntroduction nvarchar(300),
@ServerID int,
@IsHymeneal bit,
@IsGunsaluteUsed bit

AS


declare @count int
select @count=count(*) from Marry_Room_Info where GroomID=@GroomID and BrideID=@BrideID and IsExist=1

if @count >0
begin
    return 1
end


set xact_abort on
begin tran

insert into Marry_Room_Info([Name],PlayerID,PlayerName,GroomID,GroomName,BrideID,BrideName,Pwd,AvailTime,MaxCount,GuestInvite,MapIndex,BeginTime,BreakTime,RoomIntroduction,ServerID,IsHymeneal,IsGunsaluteUsed,isExist) 
values(@Name,@PlayerID,@PlayerName,@GroomID,@GroomName,@BrideID,@BrideName,@Pwd,@AvailTime,@MaxCount,@GuestInvite,@MapIndex,@BeginTime,@BreakTime,@RoomIntroduction,@ServerID,@IsHymeneal,@IsGunsaluteUsed,1)

if @@error<>0
begin
  rollback tran
  return @@error
end

select @@identity as 'identity'
set @ID=@@identity

update sys_users_detail set IsCreatedMarryRoom=1, SelfMarryRoomID=@ID where UserID=@GroomID or UserID=@BrideID
if @@error<>0
begin
  rollback tran
  return @@error
end


commit tran
set xact_abort off

return 0







GO
