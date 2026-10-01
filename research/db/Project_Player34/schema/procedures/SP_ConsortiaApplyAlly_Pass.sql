-- SQL_STORED_PROCEDURE dbo.SP_ConsortiaApplyAlly_Pass (modified 2021-06-04T05:18:35.060)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：公会关系(中立、同盟、敌对)申请通过>
-- =============================================
CREATE Procedure [dbo].[SP_ConsortiaApplyAlly_Pass]
 @ID int, 
 @UserID int, 
 @ConsortiaID int,
 @tempID int output,
 @State int output 
AS

declare @tempRight int
select @tempRight=[Right] from V_Consortia_Users where ConsortiaID=@ConsortiaID and UserID=@UserID and IsExist=1

if @tempRight is null or (@tempRight&64)=0
begin
  return 2
end

--declare @tempID int
select @tempID=Consortia1ID,@State=State from  Consortia_Apply_Ally where [ID]=@ID and Consortia2ID=@ConsortiaID and IsExist=1

if @tempID is null or @tempID=0
begin
  return 3
end

declare @AllyID int
select @AllyID=[ID] from Consortia_Ally where ((Consortia2ID=@ConsortiaID and Consortia1ID=@tempID) or (Consortia2ID=@tempID and Consortia1ID=@ConsortiaID))

--if @AllyID is null or @AllyID=0
--begin
  --return 4
--end

declare @Consortia1Name nvarchar(200)
declare @Consortia2Name nvarchar(200)

select @Consortia1Name=ConsortiaName from Consortia where ConsortiaID=@ConsortiaID and IsExist=1
if @Consortia1Name is null or @Consortia1Name=''
begin
  return 5
end

select @Consortia2Name=ConsortiaName from Consortia where ConsortiaID=@tempID and IsExist=1
if @Consortia2Name is null or @Consortia2Name=''
begin
  return 5
end

set xact_abort on
begin tran 

Update Consortia_Apply_Ally set IsExist = 0 where Consortia2ID=@ConsortiaID and Consortia1ID=@tempID and IsExist = 1

if @@error<>0
begin
  rollback tran
  return @@error
end

Update Consortia_Apply_Ally set IsExist = 0 where Consortia2ID=@tempID and Consortia1ID=@ConsortiaID and IsExist = 1

if @@error<>0
begin
  rollback tran
  return @@error
end

if @AllyID is null or @AllyID=0
begin
  insert into Consortia_Ally(Consortia1ID,Consortia2ID,State,[Date],ValidDate,IsExist)
  values(@ConsortiaID,@tempID,@State,getdate(),0,1)

if @@error<>0
begin
  rollback tran
  return @@error
end

end
else
begin
  update Consortia_Ally set IsExist=1,State=@State,[Date]=getdate() where [ID]=@AllyID

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
if @State=1
begin
 /* set @Remark1='你们与 <'
  set @Remark2='> 成功结盟!'
  set @Remark3='<'
  set @Remark4='> 与你们成功结盟!'*/
  set @Remark1=dbo.GetTranslation('SP_ConsortiaApplyAlly_Pass.Msg1')--'你们与 <{0}> 成功结盟!'
  set @Remark3=dbo.GetTranslation('SP_ConsortiaApplyAlly_Pass.Msg2')--'<{0}> 与你们成功结盟!'
  set @Type=3
end
else
begin
  --set @Remark='公会与你们中立!'
  /*set @Remark1='你们与 <'
  set @Remark2='> 议和成功，相互中立!'
  set @Remark3='<'
  set @Remark4='> 与你们议和成功，相互中立!'*/
  set @Remark1=dbo.GetTranslation('SP_ConsortiaApplyAlly_Pass.Msg3')--'你们与 <{0}> 议和成功，相互中立!'
  set @Remark3=dbo.GetTranslation('SP_ConsortiaApplyAlly_Pass.Msg4')--'<{0}> 与你们议和成功，相互中立!'
  set @Type=2
end

/*insert into Consortia_Event(ConsortiaID,Remark,[Date],IsExist)
values(@ConsortiaID,@Remark3 + @Consortia2Name + @Remark4,getdate(),1)*/
set @Remark3 = REPLACE(@Remark3,'{0}',@Consortia2Name)
insert into Consortia_Event(ConsortiaID,Remark,[Date],IsExist,Type)
values(@ConsortiaID,@Remark3,getdate(),1,@Type)

if @@error<>0
begin
  rollback tran
  return @@error
end

/*insert into Consortia_Event(ConsortiaID,Remark,[Date],IsExist)
values(@tempID,@Remark1 + @Consortia1Name + @Remark2,getdate(),1)*/
set @Remark1 = REPLACE(@Remark1,'{0}',@Consortia1Name)
insert into Consortia_Event(ConsortiaID,Remark,[Date],IsExist,Type)
values(@tempID,@Remark1,getdate(),1,@Type)

commit tran
set xact_abort off

return 0








GO
