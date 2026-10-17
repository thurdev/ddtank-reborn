-- SQL_STORED_PROCEDURE dbo.SP_Account_Register (modified 2015-01-25T14:04:48.427)
-- =============================================
-- Author:		<TrieLSL>
-- Create date: <20/9/2011,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE  [dbo].[SP_Account_Register]
	-- Add the parameters for the stored procedure here
@UserName varchar(200),
@PassWord varchar(200),
@NickName varchar(50),
--@ActiveIP varchar(50),
@Sex bit,
@Money int,
@Gold int,
@GiftToken int
AS
declare @UserID int
declare @count int
declare @countUser int

select @count= isnull(count(*),0) from Sys_Users_Detail where NickName = @NickName
select @countUser= isnull(count(*),0) from Sys_Users_Detail where UserName = @UserName
if @count <> 0
begin
  return 5   --Nick exit
end
if @countUser <> 0
begin
  return 6   --User exit
end
--add user
set xact_abort on
begin tran

insert into dbo.Sys_Users_Detail (
[UserName]
,[Password]
,[NickName]
,[Date]
,[IsConsortia]
,[ConsortiaID]
,[Sex]
,[Win]
,[Total]
,[Escape]
,[GP]
,[Honor]
,[Gold]
,[Money]
,[Style]
,[Colors]
,[Hide]
,[Grade]
,[State]
,[IsFirst]
,[Repute]
,[LastDate]
,[ChargeDate]
,[ExpendDate]
,[ActiveIP]
,[ForbidDate]
,[Skin]
,[Offer]
,[IsExist]
,[ReputeOffer]
,[LastDateSecond]
,[LastDateThird]
,[LoginCount]
,[OnlineTime]
,[AntiAddiction]
,[AntiDate]
,[RichesOffer]
,[RichesRob]
,[LastDayGP]
,[AddDayGP]
,[LastWeekGP]
,[AddWeekGP]
,[LastDayOffer]
,[AddDayOffer]
,[LastWeekOffer]
,[AddWeekOffer]
,[CheckCount]
,[Site]
,[IsMarried]
,[SpouseID]
,[SpouseName]
,[MarryInfoID]
,[DayLoginCount]
,[ForbidReason]
,[IsCreatedMarryRoom]
,[PasswordTwo]
,[SelfMarryRoomID]
,[IsGotRing]
,[ServerName]
,[Rename]
,[Nimbus]
,[LastAward]
,[GiftToken]
,[QuestSite]
,[PvePermission]
,[FightPower]
,[AnswerSite]
,[LastAuncherAward]) 
  Values (
  convert(nvarchar(200),@UserName) 
  ,convert(nvarchar(200),@PassWord) 
  ,convert(nvarchar(50),@NickName) 
  ,convert(datetime,GETDATE()) 
  ,convert(bit,0) ,convert(int,0) 
  ,convert(bit,@Sex) 
  ,convert(int,0) 
  ,convert(int,0) 
  ,convert(int,0) 
  ,convert(int,0) 
  ,convert(nvarchar(50),'0') 
  ,convert(int,9000000)--@Gold) 
  ,convert(int,9000000)--@Money) 
  ,convert(nvarchar(200),'1214|head13,,3244|hair44,,5276|cloth76,6204|face3,7008|dart,,,,,,,,,') 
  ,convert(nvarchar(200),',,,,,,,,,') 
  ,convert(int,1111111111) 
  ,convert(int,1) 
  ,convert(int,90) 
  ,convert(int,31) 
  ,convert(int,90) 
  ,convert(datetime,GETDATE()) 
  ,convert(datetime,GETDATE()) 
  ,convert(datetime,GETDATE()) 
  ,convert(nvarchar(50),'127.0.0.1') 
  ,convert(datetime,GETDATE()) 
  ,convert(nvarchar(50),'') 
  ,convert(int,0) 
  ,convert(bit,1) 
  ,convert(int,90) 
  ,convert(datetime,GETDATE()) 
  ,convert(datetime,GETDATE()) 
  ,convert(int,2) 
  ,convert(int,0) 
  ,convert(int,0) 
  ,convert(datetime,'2/1/2200') 
  ,convert(int,0) 
  ,convert(int,0) 
  ,convert(int,0) 
  ,convert(int,0) 
  ,convert(int,0) 
  ,convert(int,0) 
  ,convert(int,0) 
  ,convert(int,0) 
  ,convert(int,0) 
  ,convert(int,0) 
  ,convert(int,0) 
  ,convert(nvarchar(200),'90') 
  ,convert(bit,0) 
  ,convert(int,0) 
  ,convert(nvarchar(50),'') 
  ,convert(int,0) 
  ,convert(int,0) 
  ,convert(nvarchar(1000),'90') 
  ,convert(bit,0) 
  ,convert(nvarchar(200),NUlL) 
  ,convert(int,90) 
  ,convert(bit,0) 
  ,convert(nvarchar(50),'1') 
  ,convert(bit,0) 
  ,convert(int,89) 
  ,convert(datetime,GETDATE()) 
  ,convert(int,9000000)--@GiftToken ) 
  ,convert(varbinary(200),'') 
  ,convert(nvarchar(50),'11') 
  ,convert(int,63) 
  ,convert(int,9) 
  ,convert(datetime,'7/1/1905') ) ;
  
  SET @UserID = SCOPE_IDENTITY()
 if @@error<>0
begin
  rollback tran
  return @@error
end

insert into dbo.Sys_Users_Goods (
[UserID]
,[BagType]
,[TemplateID]
,[Place]
,[Count]
,[IsJudge]
,[Color]
,[IsExist]
,[StrengthenLevel]
,[AttackCompose]
,[DefendCompose]
,[LuckCompose]
,[AgilityCompose]
,[Skin]
,[IsBinds]
,[IsUsed]
,[BeginDate]
,[ValidDate]
,[RemoveDate]
,[RemoveType]
) 
 Values (
 convert(int,@UserID) 
 ,convert(int,0) 
 ,convert(int,7008) 
 ,convert(int,6) 
 ,convert(int,1) 
 ,convert(bit,1) 
 ,convert(nvarchar(50),'') 
 ,convert(bit,1) 
 ,convert(int,0) 
 ,convert(int,0) 
 ,convert(int,0) 
 ,convert(int,0) 
 ,convert(int,0) 
 ,convert(nvarchar(50),'') 
 ,convert(bit,0) 
 ,convert(bit,0) 
 ,convert(datetime,'9/1/2011 5:50:18 PM') 
 ,convert(int,10) 
 ,convert(datetime,'9/2/2011 8:59:00 AM') 
 ,convert(int,0) )
 
if @@error<>0
begin
  rollback tran
  return @@error
end

insert into Sys_Users_Fight(UserID,Attack,Defence,Luck,Agility,[Delay],Honor,Map,Directory,IsExist)
values(@UserID,80,50,30,270,0,'','','',1)

if @@error<>0
begin
  rollback tran
  return @@error
end
INSERT INTO [dbo].[Sys_VIP_Info]
           ([UserID])
     VALUES
           (@UserID)

if @@error<>0
begin 
  rollback tran
  return @@error
end

INSERT INTO [dbo].[Sys_Users_Texp]
           ([UserID])
     VALUES
           (@UserID)

if @@error<>0
begin 
  rollback tran
  return @@error
end

insert into [dbo].[DailyLogList]([UserID]) values(@UserID)

if @@error<>0
begin 
  rollback tran
  return @@error
end
--@@
Declare @Index Int
Declare @type Int
Set @Index = 0
Set @type = 0
While @Index < 5
  Begin   
                 If @Index = 0
                     Begin
                       Set @type = 1
                     End
                  Else
                      Begin
                        Set @type = 0
                      End
     INSERT INTO [dbo].[Sys_Users_Card]
           ([UserID],[Place],[IsExit],[Type])
     VALUES(@UserID,@Index,1,@type)
     if @@error<>0
		begin 
			rollback tran
			return @@error
		end
    Set @Index = @Index+1
  End


--@@
commit tran 
set xact_abort off

GO
