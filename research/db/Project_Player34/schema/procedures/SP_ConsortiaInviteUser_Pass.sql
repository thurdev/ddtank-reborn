-- SQL_STORED_PROCEDURE dbo.SP_ConsortiaInviteUser_Pass (modified 2021-06-04T05:18:35.160)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：用户通过公会邀请>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_ConsortiaInviteUser_Pass]
 @ID int, 
 @UserID int, 
 @UserName nvarchar(100),
 @ConsortiaID int output,
 @ConsortiaName nvarchar(100) output,
 @tempName nvarchar(100) output,
 @tempDutyID int output,
 @tempDutyName nvarchar(100) output,
 @tempOffer int output,
 @tempRichesOffer int output,
 @tempRichesRob int output,
 @tempLastDate datetime output,
 @tempWin int output,
 @tempTotal int output,
 @tempEscape int output,
 @tempID int output,
 @tempGrade int output,
 @tempLevel int output,
 @tempCUID int output,
 @tempState int output,
 @tempSex int output,
 @tempRight int output,
 @tempConsortiaRepute int output
AS

--declare @tempID int
--declare @tempName nvarchar(100)
declare @DutyID int
--declare @ConsortiaID int

select @tempID=InviteID,@tempName=InviteName,@ConsortiaID=ConsortiaID,@ConsortiaName=ConsortiaName from  Consortia_Invite_Users where [ID]=@ID and UserID=@UserID and IsExist=1

if @tempID is null or @tempID=0
begin
  return 3
end

declare @Count int
declare @MaxCount int
select @Count=[Count],@MaxCount=MaxCount,@tempConsortiaRepute=Repute from Consortia where @ConsortiaID=ConsortiaID and IsExist=1

if @Count is null or @Count+1>@MaxCount
begin
  return 6
end

select @DutyID=DutyID,@tempDutyID=DutyID,@tempDutyName=DutyName,@tempLevel=[Level],@tempRight=[Right] from Consortia_Duty where  ConsortiaID=@ConsortiaID and IsExist=1 and [Level] in (select Max([Level]) from Consortia_Duty where  ConsortiaID=@ConsortiaID and IsExist=1)

if @DutyID is null or @DutyID=0
begin
  return 4
end

declare @orderID int 
declare @temp bit
select @orderID=[ID],@temp=IsExist from Consortia_Users where UserID=@UserID 
if @temp=1
begin
  return 5
end

set xact_abort on
begin tran 

Update Consortia_Apply_Users set IsExist = 0 where UserID=@UserID and IsExist = 1

if @@error<>0
begin
  rollback tran
  return @@error
end

Update Consortia_Invite_Users set IsExist = 0 where  UserID=@UserID and IsExist = 1

if @@error<>0
begin
  rollback tran
  return @@error
end

Update Consortia set [Count] = [Count]+1 where ConsortiaID=@ConsortiaID 

if @@error<>0
begin
  rollback tran
  return @@error
end

if @orderID is null or @orderID=0
begin

insert into Consortia_Users(ConsortiaID,UserID,UserName,RatifierID,RatifierName,DutyID,Remark,IsExist,IsBanChat)
values(@ConsortiaID,@UserID,@UserName,@tempID,@tempName,@DutyID,'',1,0)

if @@error<>0
begin
  rollback tran
  return @@error
end

     select @@identity as 'identity'
     set @tempCUID=@@identity    

end
else
begin

update Consortia_Users set ConsortiaID=@ConsortiaID,RatifierID=@tempID,RatifierName=@tempName,DutyID=@DutyID,Remark='',IsExist=1,IsBanChat=0
where [ID]=@orderID

if @@error<>0
begin
  rollback tran
  return @@error
end

set @tempCUID=@orderID

end

Update Sys_Users_Detail set ConsortiaID = @ConsortiaID,IsConsortia=1,@tempOffer=Offer,@tempRichesOffer=RichesOffer,@tempRichesRob=RichesRob, 
@tempLastDate=LastDate,@tempWin=Win,@tempTotal=Total,@tempEscape=[Escape],@tempGrade=[Grade],@tempState=State,@tempSex=Sex
 where  UserID=@UserID and IsExist=1

if @@error<>0
begin
  rollback tran
  return @@error
end

commit tran
set xact_abort off

return 0








GO
