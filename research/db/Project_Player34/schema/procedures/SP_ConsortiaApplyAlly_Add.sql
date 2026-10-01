-- SQL_STORED_PROCEDURE dbo.SP_ConsortiaApplyAlly_Add (modified 2021-06-04T05:18:35.040)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：申请公会关系建立>
-- =============================================
CREATE Procedure [dbo].[SP_ConsortiaApplyAlly_Add]   
 @ID int output, 
 @Consortia1ID int, 
 @Consortia2ID int, 
 @Date datetime,
 @Remark nvarchar(100),
 @IsExist bit,
 @UserID int,
 @State int
AS

declare @tempRight int
select @tempRight=[Right] from V_Consortia_Users where ConsortiaID=@Consortia1ID and UserID=@UserID and IsExist=1

if @tempRight is null or (@tempRight&64)=0
begin
  return 2
end

declare @Count int
select @Count=Count(*) from Consortia where ConsortiaID=@Consortia2ID

if @Count is null or @Count=0
begin
  return 3
end

select @Count=Count(*) from Consortia_Ally where ((Consortia2ID=@Consortia1ID and Consortia1ID=@Consortia2ID) or (Consortia2ID=@Consortia2ID and Consortia1ID=@Consortia1ID)) and State=@State and IsExist=1

if @Count=1
begin
  return 4
end

select @ID=[ID] from Consortia_Apply_Ally where Consortia1ID=@Consortia1ID and Consortia2ID=@Consortia2ID


if @ID is null or @ID=0
begin
  insert into Consortia_Apply_Ally(Consortia1ID,Consortia2ID,[Date],Remark,IsExist,State)
  values(@Consortia1ID,@Consortia2ID,@Date,@Remark,@IsExist,@State)
  select @@identity as 'identity'
  set @ID=@@identity

  if @@error<>0
  begin
    return @@error
  end
end
else
begin
  update Consortia_Apply_Ally set [Date]=@Date,Remark=@Remark,IsExist=1,State=@State where Consortia1ID=@Consortia1ID and Consortia2ID=@Consortia2ID

  if @@error<>0
  begin
    return @@error
  end
end

return 0








GO
