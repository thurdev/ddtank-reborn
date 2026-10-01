-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Delete (modified 2021-06-04T05:18:34.910)






-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：解散一个公会>
-- =============================================
CREATE   PROCEDURE [dbo].[SP_Consortia_Delete]   
 @ConsortiaID int, 
 @UserID int
AS

declare @Count INT
select @Count=count(*) from Consortia where ConsortiaID=@ConsortiaID and ChairmanID=@UserID and IsExist=1
if @Count is null or @Count=0
begin
  return 2
end

/*四级以上公会不允许解散*/
SELECT @Count=ISNULL(COUNT(*),0) FROM dbo.Consortia WHERE  ConsortiaID=@ConsortiaID AND Level>=4
IF(@Count=1)
BEGIN
  RETURN 3
END

 

set xact_abort on
begin tran 

Update Consortia_Equip_Control set IsExist = 0 where  ConsortiaID=@ConsortiaID and IsExist=1

if @@error<>0
begin
  rollback tran
  return @@error
end

Update Consortia set IsExist = 0 where  ConsortiaID=@ConsortiaID and IsExist=1

if @@error<>0
begin
  rollback tran
  return @@error
end

Update Consortia_Apply_Users set IsExist = 0 where  ConsortiaID=@ConsortiaID and IsExist=1

if @@error<>0
begin
  rollback tran
  return @@error
end

Update Consortia_Invite_Users set IsExist = 0 where  ConsortiaID=@ConsortiaID   and IsExist=1

if @@error<>0
begin
  rollback tran
  return @@error
end

Update Consortia_Apply_Ally set IsExist = 0 where  (Consortia1ID=@ConsortiaID or Consortia2ID=@ConsortiaID) and IsExist=1

if @@error<>0
begin
  rollback tran
  return @@error
end

Update Consortia_Duty set IsExist = 0 where  ConsortiaID=@ConsortiaID and IsExist=1

if @@error<>0
begin
  rollback tran
  return @@error
end

Update Consortia_Users set IsExist = 0 where  ConsortiaID=@ConsortiaID and IsExist=1

if @@error<>0
begin
  rollback tran
  return @@error
end

Update Consortia_Ally set IsExist = 0 where  (Consortia1ID=@ConsortiaID or Consortia2ID=@ConsortiaID) and IsExist=1

if @@error<>0
begin
  rollback tran
  return @@error
end

Update Consortia_Event set IsExist = 0 where  ConsortiaID=@ConsortiaID and IsExist=1

if @@error<>0
begin
  rollback tran
  return @@error
end

Update Sys_Users_Detail set ConsortiaID = 0,RichesOffer=0,RichesRob=0 where  ConsortiaID=@ConsortiaID 

if @@error<>0
begin
  rollback tran
  return @@error
end

commit tran
set xact_abort off

return 0









GO
