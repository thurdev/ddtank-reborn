-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Scan (modified 2021-06-04T05:18:34.957)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：公会每周扣除财富，将不足财富公会清除>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Consortia_Scan]
 @NoticeID nvarchar(4000) output

AS  
set @NoticeID=''
set xact_abort on 
begin tran

update Consortia set @NoticeID =@NoticeID + cast(ConsortiaID as varchar(20)) + ',',IsExist=0  where datediff(dd, WarnDate,getdate())>14 and IsExist=1

if @@error <> 0
begin
  rollback tran
  return 1
end

if len(@NoticeID)>0
begin
 set @NoticeID = substring(@NoticeID,1,len(@NoticeID)-1)

declare @ConsortiaIDs nvarchar(4000)
declare @s nvarchar(4000)
set @ConsortiaIDs = ' (' + @NoticeID + ') '

/*
set @s = 'Update Consortia set IsExist = 0 where  ConsortiaID in ' + @ConsortiaIDs + ' and IsExist=1'
exec(@s)

if @@error<>0
begin
  rollback tran
  return @@error
end*/

set @s = 'Update Consortia_Equip_Control set IsExist = 0 where  ConsortiaID in ' + @ConsortiaIDs + ' and IsExist=1'
exec(@s)

if @@error<>0
begin
  rollback tran
  return @@error
end

set @s = 'Update Consortia_Apply_Users set IsExist = 0 where  ConsortiaID in ' + @ConsortiaIDs + ' and IsExist=1'
exec(@s)

if @@error<>0
begin
  rollback tran
  return @@error
end

set @s = 'Update Consortia_Invite_Users set IsExist = 0 where  ConsortiaID in  ' +@ConsortiaIDs   + ' and IsExist=1'
exec(@s)

if @@error<>0
begin
  rollback tran
  return @@error
end

set @s = 'Update Consortia_Apply_Ally set IsExist = 0 where  (Consortia1ID in ' +@ConsortiaIDs + ' or Consortia2ID in ' +@ConsortiaIDs+ ' ) and IsExist=1'
exec(@s)

if @@error<>0
begin
  rollback tran
  return @@error
end

set @s = 'Update Consortia_Duty set IsExist = 0 where  ConsortiaID in ' + @ConsortiaIDs+ ' and IsExist=1'
exec(@s)

if @@error<>0
begin
  rollback tran
  return @@error
end

set @s = 'Update Consortia_Users set IsExist = 0 where  ConsortiaID in ' + @ConsortiaIDs + ' and IsExist=1'
exec(@s)

if @@error<>0
begin
  rollback tran
  return @@error
end

set @s = 'Update Consortia_Ally set IsExist = 0 where  (Consortia1ID in ' +@ConsortiaIDs + ' or Consortia2ID in ' + @ConsortiaIDs + ' ) and IsExist=1'
exec(@s)

if @@error<>0
begin
  rollback tran
  return @@error
end

set @s = 'Update Consortia_Event set IsExist = 0 where  ConsortiaID in ' + @ConsortiaIDs+ ' and IsExist=1'
exec(@s)

if @@error<>0
begin
  rollback tran
  return @@error
end

set @s = 'Update Sys_Users_Detail set ConsortiaID = 0,RichesOffer=0,RichesRob=0 where  ConsortiaID in ' +@ConsortiaIDs+ '  and IsExist=1'
exec(@s)

if @@error<>0
begin
  rollback tran
  return @@error
end

end

update Consortia set DeductDate=getdate(),WarnDate=(case when a.Riches>0 then getdate() else a.WarnDate end), Riches=Riches - (select (case when a.Riches>b.Deduct then  Deduct else a.Riches end) from Consortia_Level b where b.[Level]=a.[Level])
  from Consortia a where datediff(dd, DeductDate,getdate())>7 and IsExist=1

if @@error <> 0
begin
  rollback tran
  return 2
end

commit tran
set xact_abort off

/*
if len(@NoticeID)>0
begin
 set @NoticeID = substring(@NoticeID,1,len(@NoticeID)-1)
end*/

select @NoticeID

return 0








GO
