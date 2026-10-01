-- SQL_STORED_PROCEDURE dbo.SP_ConsortiaChangeChairman (modified 2021-06-04T05:18:35.100)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：转让会长>
-- =============================================
CREATE Procedure [dbo].[SP_ConsortiaChangeChairman]
 @NickName nvarchar(200),
 @ConsortiaID int, 
 @UserID int,
 @tempUserID int output,
 @tempUserName Nvarchar(200) output,
 @tempDutyLevel int output,
 @tempDutyName Nvarchar(200) output,
 @tempRight int output
AS
declare @Count int
declare @ID int
select @Count=count(*) from Consortia where ConsortiaID=@ConsortiaID and ChairmanID=@UserID and IsExist=1

if @Count is null or @Count=0
begin
  return 2
end


declare @IsExist  bit  

select  @IsExist = IsExist from Sys_Users_Detail where  NickName=@NickName

 if @IsExist is null or @IsExist=0
begin
  return 1
end

declare @Grade int 
select @Grade=isnull(Grade, 0) from Sys_Users_Detail where NickName=@NickName and IsExist=1

if @Grade is null or @Grade<5
begin
  return 2
end

declare @CurrentLevel int
declare @CurrentID int
declare @CurrentName nvarchar(200)
declare @Duty int
declare @MaxDuty int

select @CurrentLevel=[Level],@CurrentID=UserID,@CurrentName=UserName,@ID=[ID],@tempUserID=UserID,@tempUserName=UserName from V_Consortia_Users where UserName=@NickName and ConsortiaID=@ConsortiaID and IsExist=1
if @CurrentLevel is null or @CurrentLevel=1
begin
  return 3
end

select @Duty=DutyID from Consortia_Duty where [Level]=1 and ConsortiaID=@ConsortiaID and IsExist=1
if @Duty is null 
begin
  return 4
end

select @MaxDuty=DutyID,@tempDutyLevel=[Level],@tempDutyName=DutyName,@tempRight=[Right] from Consortia_Duty where  ConsortiaID=@ConsortiaID and IsExist=1 and [Level] in (select Max([Level]) from Consortia_Duty where  ConsortiaID=@ConsortiaID and IsExist=1)

  if @MaxDuty is null 
  begin
    return 5
  end

set xact_abort on
begin tran 

Update Consortia set ChairmanID = @CurrentID,ChairmanName = @CurrentName  where  ConsortiaID=@ConsortiaID and IsExist=1

if @@error<>0
begin
  rollback tran
  return @@error
end

Update Consortia_Users set DutyID=@MaxDuty where  DutyID=@Duty and ConsortiaID=@ConsortiaID and IsExist=1

if @@error<>0
begin
  rollback tran
  return @@error
end

Update Consortia_Users set DutyID=@Duty where  [ID]=@ID and ConsortiaID=@ConsortiaID and IsExist=1

if @@error<>0
begin
  rollback tran
  return @@error
end

commit tran
set xact_abort off

return 0







GO
