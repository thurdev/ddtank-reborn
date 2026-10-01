-- SQL_STORED_PROCEDURE dbo.SP_ConsortiaDuty_Add (modified 2021-06-04T05:18:35.110)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：添加公会新职责(暂未用)>
-- =============================================
CREATE Procedure [dbo].[SP_ConsortiaDuty_Add]   
 @DutyID int output, 
 @ConsortiaID int, 
 @DutyName nvarchar(100),
 @Level int,
 @UserID int,
 @Right int
AS

declare @tempRight int
select @tempRight=[Right] from V_Consortia_Users where ConsortiaID=@ConsortiaID and UserID=@UserID and IsExist=1

if @tempRight is null or (@tempRight&128)=0
begin
  return 2
end

select @Level=isnull(Max([Level]),0) from Consortia_Duty where  ConsortiaID=@ConsortiaID and IsExist=1

if @Level>9 or @Level is null or @Level=0
begin
  return 3
end

set xact_abort on
begin tran 

update Consortia_Duty set [Level] = [Level]+1 where [Level]=@Level and ConsortiaID=@ConsortiaID and IsExist=1

if @@error<>0
begin
  rollback tran
  return @@error
end

insert into Consortia_Duty(ConsortiaID,DutyName,[Right],[Level])
values(@ConsortiaID,@DutyName,@Right,@Level)

if @@error<>0
begin
  rollback tran
  return @@error
end

commit tran
set xact_abort off


return 0








GO
