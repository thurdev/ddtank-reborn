-- SQL_STORED_PROCEDURE dbo.SP_ConsortiaApplyUser_Add (modified 2021-06-04T05:18:35.067)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：用户申请加入公会>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_ConsortiaApplyUser_Add]   
 @ID int output, 
 @ApplyDate DateTime, 
 @ConsortiaID int, 
 @ConsortiaName nvarchar(100),
 @IsExist bit,
 @Remark nvarchar(100),
 @UserID int,
 @UserName nvarchar(100)
AS
/*
if @ConsortiaID=0
begin
  update Consortia_Apply_Users set IsExist=0 where UserID=@UserID and IsExist=1
  return 0
end

select @ConsortiaName=ConsortiaName from Consortia where ConsortiaID=@ConsortiaID

if @ConsortiaName is null or @ConsortiaName=''
begin
  return 2
end*/

declare @Count int
declare @MaxCount int
select @ConsortiaName=ConsortiaName,@Count=[Count],@MaxCount=MaxCount from Consortia where @ConsortiaID=ConsortiaID and IsExist=1

if @ConsortiaName is null or @ConsortiaName=''
begin
  return 2
end

if @Count is null or @Count+1>@MaxCount
begin
  return 6
end

--declare @Count int
select @Count=count(*) from Consortia_Apply_Users where UserID=@UserID and @ConsortiaID=ConsortiaID 

if @Count=0
begin
  insert into Consortia_Apply_Users(ConsortiaID,ConsortiaName,UserID,UserName,ApplyDate,Remark,IsExist)
  values(@ConsortiaID,@ConsortiaName,@UserID,@UserName,@ApplyDate,@Remark,@IsExist)
  select @@identity as 'identity'
  set @ID=@@identity

  if @@error<>0
  begin
    return @@error
  end
end
else
begin
  update Consortia_Apply_Users set ConsortiaID=@ConsortiaID,ConsortiaName=@ConsortiaName,ApplyDate=@ApplyDate,Remark=@Remark,IsExist=1 where UserID=@UserID and @ConsortiaID=ConsortiaID 

  if @@error<>0
  begin
    return @@error
  end
end

return 0








GO
