-- SQL_STORED_PROCEDURE dbo.SP_ConsortiaInviteUser_Add (modified 2021-06-04T05:18:35.143)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：公会邀请用户入会>
-- =============================================
CREATE Procedure [dbo].[SP_ConsortiaInviteUser_Add]   
 @ID int output, 
 @ConsortiaID int, 
 @ConsortiaName nvarchar(100),
 @InviteDate datetime, 
 @InviteID int,
 @InviteName nvarchar(100),
 @IsExist bit,
 @Remark nvarchar(100),
 @UserID int out,
 @UserName nvarchar(100)
AS

declare @tempID int

declare @tempRight int
select @tempRight=[Right] from V_Consortia_Users where ConsortiaID=@ConsortiaID and UserID=@InviteID and IsExist=1

if @tempRight is null or (@tempRight&2)=0
begin
  return 2
end

declare @tempConsortiaID int
select @UserID=UserID,@tempConsortiaID=ConsortiaID from Sys_Users_Detail where NickName=@UserName and IsExist=1

if @UserID is null or @UserID=0
begin
  return 4
end

if @tempConsortiaID <>0
begin
  return 5
end

select @ConsortiaName=ConsortiaName from Consortia where ConsortiaID=@ConsortiaID and IsExist=1

if @ConsortiaName is null or @ConsortiaName=''
begin
  return 3
end

declare @Count int
declare @MaxCount int
select @Count=[Count],@MaxCount=MaxCount from Consortia where @ConsortiaID=ConsortiaID and IsExist=1

if @Count is null or @Count+1>@MaxCount
begin
  return 6
end

--declare @Count int
--select @Count=count(*) from Consortia_Invite_Users where UserID=@UserID and ConsortiaID=@ConsortiaID 

select @ID=[ID] from Consortia_Invite_Users where UserID=@UserID and ConsortiaID=@ConsortiaID 

if @ID=0 or @ID is null
begin
  insert into Consortia_Invite_Users(ConsortiaID,ConsortiaName,InviteDate,InviteID,InviteName,IsExist,Remark,UserID,UserName)
  values(@ConsortiaID,@ConsortiaName,@InviteDate,@InviteID,@InviteName,@IsExist,@Remark,@UserID,@UserName)
  select @@identity as 'identity'
  set @ID=@@identity

  if @@error<>0
  begin
    return @@error
  end
end
else
begin
  update Consortia_Invite_Users set InviteDate=@InviteDate,InviteID=@InviteID,InviteName=@InviteName,Remark=@Remark,IsExist=1 where [ID]=@ID --UserID=@UserID and ConsortiaID=@ConsortiaID 

  if @@error<>0
  begin
    return @@error
  end
end

return 0








GO
