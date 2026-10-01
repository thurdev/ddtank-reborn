-- SQL_STORED_PROCEDURE dbo.SP_ConsortiaDuty_Delete (modified 2021-06-04T05:18:35.117)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：删除一个公会职责(暂未用)>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_ConsortiaDuty_Delete]   
 @UserID int,
 @ConsortiaID int,
 @DutyID int
AS

declare @CurrentLevel int
declare @MaxLevel int
declare @MaxDuty int
declare @tempIsManageDuty bit

select @CurrentLevel=[Level] from Consortia_Duty where DutyID=@DutyID and ConsortiaID=@ConsortiaID and IsExist=1
if @CurrentLevel is null or @CurrentLevel=1
begin
  return 3
end

--select @tempIsManageDuty=IsManageDuty from V_Consortia_Users where ConsortiaID=@ConsortiaID and UserID=@UserID and IsExist=1
--if @tempIsManageDuty is null or @tempIsManageDuty=0
--begin
--  return 2
--end

select @MaxDuty=DutyID,@MaxLevel=[Level] from Consortia_Duty where  ConsortiaID=@ConsortiaID and IsExist=1 and [Level] in (select Max([Level]) from Consortia_Duty where  ConsortiaID=@ConsortiaID and IsExist=1)

if @MaxLevel is null or @MaxLevel=@CurrentLevel
begin
  return 3
end

set xact_abort on
begin tran 

Update Consortia_Duty set IsExist = 0 where  DutyID=@DutyID and IsExist=1

if @@error<>0 
begin
  rollback tran
  return @@error
end

Update Consortia_Duty set [Level] = [Level]-1 where ConsortiaID=@ConsortiaID and [Level]>@CurrentLevel and IsExist=1

if @@error<>0
begin
  rollback tran
  return @@error
end

Update Consortia_Users set DutyID = @MaxDuty where  DutyID=@DutyID and IsExist=1

if @@error<>0
begin
  rollback tran
  return @@error
end

commit tran
set xact_abort off

return 0









GO
