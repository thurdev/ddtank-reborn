-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Add (modified 2021-06-04T05:18:34.860)



-- =============================================
-- Author:		<Eric>
-- ALTER  date: <2009-10-22>
-- Description:	<公会组织：创建一个公会>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Consortia_Add]   
 @ConsortiaID int output, 
 @BuildDate DateTime, 
 @CelebCount int, 
 @ChairmanID int, 
 @ChairmanName nvarchar(100),
 @ConsortiaName nvarchar(100), 
 @CreatorID int, 
 @CreatorName nvarchar(100), 
 @Description nvarchar(1000), 
 @Honor int, 
 @IP nvarchar(100), 
 @IsExist bit, 
 @Level int,
 @MaxCount int,
 @Placard nvarchar(1000), 
 @Port int,
 @Repute int,
 @Count int,
 @Riches int, 
 @tempDutyLevel int output,
 @tempDutyName varchar(200) output,
 @tempRight int output

AS

declare @Same int
select @Same=count(*) from Consortia where ConsortiaName=@ConsortiaName and IsExist=1

if @same<>0
begin
  return 2
end

declare @ID int 
declare @temp bit
select @ID=[ID],@temp=IsExist from Consortia_Users where UserID=@CreatorID 
if @temp=1
begin
  return 3
end

 set @tempDutyLevel=1
 set @tempDutyName = dbo.GetTranslation('SP_Consortia_Add.Duty1')
 set @tempRight=4095

set xact_abort on
begin tran 

insert into Consortia( BuildDate,CelebCount,ChairmanID,ChairmanName, ConsortiaName, CreatorID, CreatorName, [Description], Honor, IP, IsExist, [Level], MaxCount, Placard,Port,Repute,[Count],Riches) 
values( @BuildDate,@CelebCount,@ChairmanID,@ChairmanName, @ConsortiaName, @CreatorID, @CreatorName, @Description, @Honor, @IP, @IsExist, @Level, @MaxCount, @Placard,@Port,@Repute,@Count,@Riches)
select @@identity as 'identity'
set @ConsortiaID=@@identity

if @@error<>0
begin
  rollback tran
  return 1
end

declare @DutyID int
insert into Consortia_Duty(ConsortiaID,[Level],DutyName,[Right],IsExist)
values(@ConsortiaID,1,dbo.GetTranslation('SP_Consortia_Add.Duty1'),4095,1)
select @@identity as 'identity'
set @DutyID=@@identity

if @@error<>0
begin
  rollback tran
  return 1
end

insert into Consortia_Duty(ConsortiaID,[Level],DutyName,[Right],IsExist)
values(@ConsortiaID,2,dbo.GetTranslation('SP_Consortia_Add.Duty2'),6191,1)

if @@error<>0
begin
  rollback tran
  return 1
end

insert into Consortia_Duty(ConsortiaID,[Level],DutyName,[Right],IsExist)
values(@ConsortiaID,3,dbo.GetTranslation('SP_Consortia_Add.Duty3'),4103,1)

if @@error<>0
begin
  rollback tran
  return 1
end

insert into Consortia_Duty(ConsortiaID,[Level],DutyName,[Right],IsExist)
values(@ConsortiaID,4,dbo.GetTranslation('SP_Consortia_Add.Duty4'),4096,1)

if @@error<>0
begin
  rollback tran
  return 1
end

insert into Consortia_Duty(ConsortiaID,[Level],DutyName,[Right],IsExist)
values(@ConsortiaID,5,dbo.GetTranslation('SP_Consortia_Add.Duty5'),4096,1)

if @@error<>0
begin
  rollback tran
  return 1
end

if @ID is null or @ID=0
begin

insert into Consortia_Users(ConsortiaID,UserID,UserName,RatifierID,RatifierName,DutyID,Remark,IsExist,IsBanChat)
values(@ConsortiaID,@CreatorID,@CreatorName,@CreatorID,@CreatorName,@DutyID,'',1,0)

if @@error<>0
begin
  rollback tran
  return 1
end

end
else
begin

update Consortia_Users set ConsortiaID=@ConsortiaID,RatifierID=@CreatorID,RatifierName=@CreatorName,DutyID=@DutyID,Remark='',IsExist=1,IsBanChat=0
where [ID]=@ID

if @@error<>0
begin
  rollback tran
  return 1
end

end

--insert into Consortia_Ally( Consortia1ID,Consortia2ID,State,Date,ValidDate,IsExist) 
--select @ConsortiaID,ConsortiaID,0,getdate(),0,1 from Consortia where ConsortiaID<>@ConsortiaID and IsExist=1

--if @@error<>0
--begin
--  rollback tran
--  return @@error
--end

Update Sys_Users_Detail set ConsortiaID = @ConsortiaID,IsConsortia=1 where  UserID=@CreatorID and IsExist=1

if @@error<>0
begin
  rollback tran
  return @@error
end

commit tran
set xact_abort off

return 0







GO
