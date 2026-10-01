-- SQL_STORED_PROCEDURE dbo.SP_Users_Active (modified 2022-06-05T19:04:11.590)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：激活用户>
-- =============================================
CREATE Procedure [dbo].[SP_Users_Active]
@UserID int out,
@Attack int,
@Colors Nvarchar(200),
@ConsortiaID int,
@Defence int,
@Gold int,
@GP int,
@Grade int,
@Luck int,
@Money int,
@Style Nvarchar(200),
@Agility int,
@State int,
@UserName Nvarchar(200),
@PassWord Nvarchar(200),
@Sex bit,
@Hide int,
@ActiveIP Nvarchar(50),
@Skin Nvarchar(500),
@Site nvarchar(200)

as
declare @count int

set @GP = 1
set @Grade = 1



select @count= isnull(count(*),0) from Sys_Users_Detail where UserName = @UserName

if @count <> 0
begin
  return 1
end

set xact_abort on
begin tran

insert into Sys_Users_Detail(UserName,[PassWord],NickName,[Date],IsConsortia,ConsortiaID,Sex,Win,Total,[Escape],GP,Honor,Gold,[Money],Style,Colors,Hide,LastDate,Grade,State,IsFirst,Repute,ActiveIP,IsExist,Skin,Site)
values(@UserName,@PassWord,'',getdate(),0,0,@Sex,0,0,0,@GP,'',0,0,@Style,@Colors,@Hide,GETDATE(),@Grade,@State,0,0,@ActiveIP,1,@Skin,@Site)

if @@error <> 0
begin
  rollback tran
  return @@error
end

select @UserID = isnull(@@IDENTITY ,0)

if @UserID = 0 
begin
  rollback tran
  return 1
end

insert into Sys_Users_Fight(UserID,Attack,Defence,Luck,Agility,[Delay],Honor,Map,Directory,IsExist)
values(@UserID,@Attack,@Defence,@Luck,@Agility,0,'','','',1)

if @@error<>0
begin
  rollback tran
  return @@error
end

SET IDENTITY_INSERT [dbo].[Sys_VIP_Info] ON

INSERT INTO [dbo].[Sys_VIP_Info]([UserID])
VALUES(@UserID)

if @@error<>0
begin 
  rollback tran
  return @@error
end

INSERT INTO [dbo].[Sys_Users_Texp]([UserID])
VALUES(@UserID)

if @@error<>0
begin 
  rollback tran
  return @@error
end

insert into [dbo].[DailyLogList]([UserID])
values(@UserID)

if @@error<>0
begin 
  rollback tran
  return @@error
end
  
if @@error<>0
begin 
	rollback tran
	return @@error
end

commit tran
set xact_abort off
return 0








GO
