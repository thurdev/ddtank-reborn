-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Riches_Add (modified 2021-06-04T05:18:34.940)


-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：捐献公会财富>
-- =============================================
CREATE Procedure [dbo].[SP_Consortia_Riches_Add]
@ConsortiaID int,
@Riches int output,
@Type int,
@UserName Nvarchar(100)
as

declare @OrdRiches int
select @OrdRiches=Riches from Consortia where ConsortiaID=@ConsortiaID and IsExist=1

if @OrdRiches is null 
begin
	return  2
end

if @Riches<0 and @OrdRiches<-@Riches
begin
	set @Riches = -@OrdRiches	
end

set xact_abort on
begin tran 

update  Consortia set Riches=Riches+@Riches,WarnDate=getdate()  where ConsortiaID=@ConsortiaID

if @@error <> 0
begin
  rollback tran
  return 3
end

declare @Remark1 nvarchar(100)

if @Type=5
begin
  set @Remark1=dbo.GetTranslation('SP_Consortia_Riches_Add.Msg1')
set @Remark1 = REPLACE(@Remark1,'{0}',@UserName)
set @Remark1 = REPLACE(@Remark1,'{1}',@Riches)
insert into Consortia_Event(ConsortiaID,[Date],Type,NickName,EventValue,ManagerName,IsExist,Remark)
values(@ConsortiaID,getdate(),@Type,@UserName,@Riches,@UserName,1,@Remark1)


if @@error<>0
begin
  rollback tran
  return 4
end

end

commit tran
set xact_abort off

return 0

GO
