-- SQL_STORED_PROCEDURE dbo.SP_ConsortiaAlly_Add (modified 2021-06-04T05:18:35.030)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：新建公会关系>
-- =============================================
CREATE Procedure [dbo].[SP_ConsortiaAlly_Add]   
 @ID int output, 
 @Consortia1ID int, 
 @Consortia2ID int,
 @State int,
 @Date datetime,
 @ValidDate int,
 @IsExist bit,
 @UserID int
AS

declare @Right int
select @Right=[Right] from V_Consortia_Users where ConsortiaID=@Consortia1ID and UserID=@UserID and IsExist=1

if @Right is null or (@Right&64)=0
begin
  return 2
end

declare @AllyID int
declare @OldState int
select @AllyID=[ID],@OldState=State from Consortia_Ally where (Consortia2ID=@Consortia1ID and Consortia1ID=@Consortia2ID) or (Consortia2ID=@Consortia2ID and Consortia1ID=@Consortia1ID)

if  @State=1
begin
  return 4
end

if  @State=0 and @OldState=2
begin
  return 4
end


declare @Consortia1Name nvarchar(200)
declare @Consortia2Name nvarchar(200)

select @Consortia1Name=ConsortiaName from Consortia where ConsortiaID=@Consortia1ID and IsExist=1
if @Consortia1Name is null or @Consortia1Name=''
begin
  return 3
end

select @Consortia2Name=ConsortiaName from Consortia where ConsortiaID=@Consortia2ID and IsExist=1
if @Consortia2Name is null or @Consortia2Name=''
begin
  return 3
end

set xact_abort on
begin tran 

Update Consortia_Apply_Ally set IsExist = 0 where Consortia2ID=@Consortia1ID and Consortia1ID=@Consortia2ID and IsExist = 1

if @@error<>0
begin
  rollback tran
  return @@error
end

Update Consortia_Apply_Ally set IsExist = 0 where Consortia2ID=@Consortia2ID and Consortia1ID=@Consortia1ID and IsExist = 1

if @@error<>0
begin
  rollback tran
  return @@error
end


if @AllyID is null or @AllyID=0
begin
  insert into Consortia_Ally(Consortia1ID,Consortia2ID,State,[Date],ValidDate,IsExist)
  values(@Consortia1ID,@Consortia2ID,@State,@Date,@ValidDate,@IsExist)

if @@error<>0
begin
  rollback tran
  return @@error
end

end
else
begin
  update Consortia_Ally set IsExist=@IsExist,State=@State,[Date]=@Date,ValidDate= @ValidDate where [ID]=@AllyID

if @@error<>0
begin
  rollback tran
  return @@error
end

end

declare @Remark1 nvarchar(100)
declare @Remark2 nvarchar(100)
declare @Remark3 nvarchar(100)
declare @Remark4 nvarchar(100)
declare @Type int
if @State=2
begin
/*  set @Remark1='<'
  set @Remark2='> 向你们宣战，成为敌对状态!'
  set @Remark3='你们向 <'
  set @Remark4='> 宣战，成为敌对状态!'*/
  set @Remark1=dbo.GetTranslation('SP_ConsortiaAlly_Add.Msg1')--'<{0}> 向你们宣战，成为敌对状态!'
  set @Remark3=dbo.GetTranslation('SP_ConsortiaAlly_Add.Msg2')--'你们向 <{0}> 宣战，成为敌对状态!'
  set @Type=1
end
else
begin
  --set @Remark='公会与你们中立!'
 /* set @Remark1='<'
  set @Remark2='> 与你们解除盟约，相互中立!'
  set @Remark3='你们与 <'
  set @Remark4='> 解除盟约，相互中立!'*/
  set @Remark1=dbo.GetTranslation('SP_ConsortiaAlly_Add.Msg3')--'<{0}> 与你们解除盟约，相互中立!'
  set @Remark3=dbo.GetTranslation('SP_ConsortiaAlly_Add.Msg4')--'你们与 <{0}> 解除盟约，相互中立!'
  set @Type=4
end

/*insert into Consortia_Event(ConsortiaID,Remark,[Date],IsExist)
values(@Consortia1ID,@Remark3 + @Consortia2Name + @Remark4,getdate(),1)*/
set @Remark3 = REPLACE(@Remark3,'{0}',@Consortia2Name)
insert into Consortia_Event(ConsortiaID,Remark,[Date],IsExist,Type)
values(@Consortia1ID,@Remark3,getdate(),1,@Type)

if @@error<>0
begin
  rollback tran
  return @@error
end

--insert into Consortia_Event(ConsortiaID,Remark,[Date],IsExist)
--values(@Consortia2ID,@Consortia1Name + '公会与你们宣战!',getdate(),1)
set @Remark1 = REPLACE(@Remark1,'{0}',@Consortia1Name)
insert into Consortia_Event(ConsortiaID,Remark,[Date],IsExist,Type)
values(@Consortia2ID,@Remark1,getdate(),1,@Type)

if @@error<>0
begin
  rollback tran
  return @@error
end

commit tran
set xact_abort off


return 0








GO
