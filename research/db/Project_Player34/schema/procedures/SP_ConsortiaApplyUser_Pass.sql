-- SQL_STORED_PROCEDURE dbo.SP_ConsortiaApplyUser_Pass (modified 2021-06-04T05:18:35.083)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：用户申请通过操作>
-- =============================================
CREATE Procedure [dbo].[SP_ConsortiaApplyUser_Pass]
 @ID int, 
 @UserID int, 
 @UserName nvarchar(100),
 @ConsortiaID int,
 @tempID int output,
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
 @tempGrade int output,
 @tempLevel int output,
 @tempCUID int output,
 @tempState int output,
 @tempSex int output,
 @tempDutyRight int output,
 @tempConsortiaRepute int output,
 @tempLoginName  nvarchar(100) output

AS

declare @tempRight int
select @tempRight=[Right] from V_Consortia_Users where ConsortiaID=@ConsortiaID and UserID=@UserID and IsExist=1

if @tempRight is null or (@tempRight&1)=0
begin
  return 2
end

--declare @tempID int
--declare @tempName nvarchar(100)
declare @DutyID int

select @tempID=UserID,@tempName=UserName from  Consortia_Apply_Users where [ID]=@ID and ConsortiaID=@ConsortiaID and IsExist=1

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


select @DutyID=DutyID,@tempDutyID=DutyID,@tempDutyName=DutyName,@tempLevel=[Level],@tempDutyRight=[Right] from Consortia_Duty where  ConsortiaID=@ConsortiaID and IsExist=1 and [Level] in (select Max([Level]) from Consortia_Duty where  ConsortiaID=@ConsortiaID and IsExist=1)

if @DutyID is null or @DutyID=0
begin
  return 4
end

declare @orderID int 
declare @temp bit
select @orderID=[ID],@temp=IsExist from Consortia_Users where UserID=@tempID 
if @temp=1
begin
  return 5
end

set xact_abort on
begin tran 

Update Consortia_Apply_Users set IsExist = 0 where UserID=@tempID and IsExist = 1

if @@error<>0
begin
  rollback tran
  return @@error
end

Update Consortia_Invite_Users set IsExist = 0 where UserID=@tempID and IsExist = 1

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
values(@ConsortiaID,@tempID,@tempName,@UserID,@UserName,@DutyID,'',1,0)

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

update Consortia_Users set ConsortiaID=@ConsortiaID,RatifierID=@UserID,RatifierName=@UserName,DutyID=@DutyID,Remark='',IsExist=1,IsBanChat=0 where [ID]=@orderID

if @@error<>0
begin
  rollback tran
  return @@error
end

set @tempCUID=@orderID

end

Update Sys_Users_Detail set ConsortiaID = @ConsortiaID,IsConsortia=1,@tempOffer=Offer,@tempRichesOffer=RichesOffer,@tempRichesRob=RichesRob, 
@tempLastDate=LastDate,@tempWin=Win,@tempTotal=Total,@tempEscape=[Escape],@tempGrade=[Grade],@tempState=State,@tempSex=Sex,@tempLoginName=UserName
 where  UserID=@tempID 
 insert into Consortia_Event(ConsortiaID,[Date],Type,NickName,EventValue,ManagerName,IsExist,Remark)
values(@ConsortiaID,GETDATE(),6,@tempName,0,@UserName,1,'')

if @@error<>0
begin
  rollback tran
  return @@error
end

commit tran
set xact_abort off

return 0








GO
