-- SQL_STORED_PROCEDURE dbo.SP_ConsortiaDuty_Update (modified 2021-06-04T05:18:35.130)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：公会职责改名>
-- =============================================
CREATE Procedure [dbo].[SP_ConsortiaDuty_Update]
 @DutyID int output, 
 @ConsortiaID int, 
 @DutyName nvarchar(100) output,
 @Level int output,
 @UserID int,
 @UpdateType int,
 @Right int output
AS

declare @tempRight int
select @tempRight=[Right] from V_Consortia_Users where ConsortiaID=@ConsortiaID and UserID=@UserID and IsExist=1

if @tempRight is null or (@tempRight&64)=0
begin
  return 2
end


if @UpdateType=1
begin


select @Level=isnull(Max([Level]),0) from Consortia_Duty where  ConsortiaID=@ConsortiaID and IsExist=1

if @Level>9 or @Level is null or @Level=0
begin
  return 5
end

set xact_abort on
begin tran 

update Consortia_Duty set [Level] = [Level]+1 where [Level]=@Level and ConsortiaID=@ConsortiaID and IsExist=1

if @@error<>0
begin
  rollback tran
  return @@error
end

insert into Consortia_Duty(ConsortiaID,DutyName,[Level],[Right])
values(@ConsortiaID,@DutyName,@Level,@Right)
set @DutyID=@@identity

if @@error<>0
begin
  rollback tran
  return @@error
end

commit tran
set xact_abort off
/*
update Consortia_Duty set DutyName=@DutyName where  ConsortiaID=@ConsortiaID and DutyID=@DutyID and IsExist=1

if @@error<>0
begin
  return @@error
end*/

end

if @UpdateType=2
begin

  select @Level=isnull([Level],0) from Consortia_Duty where ConsortiaID=@ConsortiaID and DutyID=@DutyID and IsExist=1

  if @Level = 1
  begin

    update Consortia_Duty set DutyName=@DutyName,@Right=[Right],@Level=[Level]
     where  ConsortiaID=@ConsortiaID and DutyID=@DutyID and IsExist=1

    if @@error<>0
    begin
      return @@error
    end

  end
  else
  begin

    update Consortia_Duty set DutyName=@DutyName,@Right=[Right],@Level=[Level]
     where  ConsortiaID=@ConsortiaID and DutyID=@DutyID and IsExist=1

    if @@error<>0
    begin
      return @@error
    end

  end

end

declare @CurrentLevel int
declare @MaxLevel int

if @UpdateType=3
begin

select @CurrentLevel = [Level] from Consortia_Duty where ConsortiaID=@ConsortiaID and DutyID=@DutyID and IsExist=1
if @CurrentLevel is null or  @CurrentLevel<3
begin
  return 3
end

select @MaxLevel=max([Level]) from Consortia_Duty where ConsortiaID=@ConsortiaID and IsExist=1
if @MaxLevel is null or  @MaxLevel=@CurrentLevel
begin
  return 4
end

set xact_abort on
begin tran 

update Consortia_Duty set [Level]=@CurrentLevel where  ConsortiaID=@ConsortiaID and [Level]=@CurrentLevel-1 and IsExist=1

if @@error<>0
begin
  rollback tran
  return @@error
end

update Consortia_Duty set [Level]=[Level]-1 where  ConsortiaID=@ConsortiaID and DutyID=@DutyID and IsExist=1

if @@error<>0
begin
  rollback tran
  return @@error
end

commit tran
set xact_abort off

end



if @UpdateType=4
begin

select @CurrentLevel = [Level] from Consortia_Duty where ConsortiaID=@ConsortiaID and DutyID=@DutyID and IsExist=1
if @CurrentLevel is null or  @CurrentLevel=1
begin
  return 3
end

select @MaxLevel=max([Level]) from Consortia_Duty where ConsortiaID=@ConsortiaID and IsExist=1
if @MaxLevel is null or  @MaxLevel<@CurrentLevel+2
begin
  return 4
end

set xact_abort on
begin tran 

update Consortia_Duty set [Level]=@CurrentLevel where  ConsortiaID=@ConsortiaID and [Level]=@CurrentLevel+1 and IsExist=1

if @@error<>0
begin
  rollback tran
  return @@error
end

update Consortia_Duty set [Level]=[Level]+1 where  ConsortiaID=@ConsortiaID and DutyID=@DutyID and IsExist=1

if @@error<>0
begin
  rollback tran
  return @@error
end

commit tran
set xact_abort off

end


return 0








GO
