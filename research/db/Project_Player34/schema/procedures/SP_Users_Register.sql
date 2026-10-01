-- SQL_STORED_PROCEDURE dbo.SP_Users_Register (modified 2021-06-04T05:18:36.313)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：用户注册形象,旧版>
-- =============================================
CREATE Procedure [dbo].[SP_Users_Register]

@UserName varchar(200),
@PassWord varchar(200),
@NickName varchar(50),

@BArmID int,
@BHairID int,
@BFaceID int,
@BClothID int,
@GArmID int,
@GHairID int,
@GFaceID int,
@GClothID int,

@ArmColor varchar(50),
@HairColor varchar(50),
@FaceColor varchar(50),
@ClothColor varchar(50),
@Sex int

as
declare @ArmID int
declare @HairID int
declare @FaceID int
declare @ClothID int
declare @isFirst bit
declare @UserID int
declare @CategoryID int
declare @Attack int
declare @Defence int
declare @Agility int
declare @Luck int

declare @style varchar(1000)
declare @color varchar(1000)

declare @count int

select @count= isnull(count(*),0) from Sys_Users_Detail where NickName = @NickName

if @count <> 0
begin
  return 2
end

if @Sex=-1
  begin
    select @isFirst = IsFirst,@UserID=[UserID],@Sex=Sex from Sys_Users_Detail where UserName =@UserName and [PassWord] = @PassWord 
  end
else
  begin
    select @isFirst = IsFirst,@UserID=[UserID] from Sys_Users_Detail where UserName =@UserName and [PassWord] = @PassWord 
  end

if isnull(@isFirst,0)<>0
  return 3

if @Sex<>0
  begin
   set @ArmID = @BArmID
   set @HairID = @BHairID
   set @FaceID = @BFaceID
   set @ClothID = @BClothID
  end
else
  begin
   set @ArmID = @GArmID
   set @HairID = @GHairID
   set @FaceID = @GFaceID
   set @ClothID = @GClothID
  end

set @style =  ',,' + cast(@HairID as varchar(20))  + ',,' + cast(@ClothID as varchar(20))  + ',' + cast(@FaceID as varchar(20))  + ',' + cast(@ArmID as varchar(20)) 
set @color = ',,' + @HairColor + ',,' + @ClothColor + ',' + @FaceColor + ',' + @ArmColor

set xact_abort on
begin tran

select @Attack=Attack,@Defence=Defence,@Agility=Agility,@Luck=Luck,@CategoryID=CategoryID from [Project_Game34].[dbo].Shop_Goods where TemplateID = @ArmID

if isnull(@CategoryID,0)=0
begin
  rollback tran
  return @@error
end

insert into Sys_Users_Goods(UserID,BagType,TemplateID,Place,[Count],IsJudge,Color,IsExist,StrengthenLevel,AttackCompose,DefendCompose,LuckCompose,AgilityCompose,IsBinds,BeginDate,ValidDate)
values(@UserID,0,@ArmID,@CategoryID-1,1,1,@ArmColor,1,0,0,0,0,0,1,getdate(),0)

if @@error<>0
begin
  rollback tran
  return @@error
end

select @Attack=@Attack+Attack,@Defence=@Defence+Defence,@Agility=@Agility+Agility,@Luck=@Luck+Luck,@CategoryID=CategoryID from [Project_Game34].[dbo].Shop_Goods where TemplateID = @HairID

if isnull(@CategoryID,0)=0
begin
  rollback tran
  return @@error
end

insert into Sys_Users_Goods(UserID,BagType,TemplateID,Place,[Count],IsJudge,Color,IsExist,StrengthenLevel,AttackCompose,DefendCompose,LuckCompose,AgilityCompose,IsBinds,BeginDate,ValidDate)
values(@UserID,0,@HairID,@CategoryID-1,1,1,@HairColor,1,0,0,0,0,0,1,getdate(),15)

if @@error<>0
begin
  rollback tran
  return @@error
end

select @Attack=@Attack+Attack,@Defence=@Defence+Defence,@Agility=@Agility+Agility,@Luck=@Luck+Luck,@CategoryID=CategoryID from [Project_Game34].[dbo].Shop_Goods where TemplateID = @FaceID

if isnull(@CategoryID,0)=0
begin
  rollback tran
  return @@error
end

insert into Sys_Users_Goods(UserID,BagType,TemplateID,Place,[Count],IsJudge,Color,IsExist,StrengthenLevel,AttackCompose,DefendCompose,LuckCompose,AgilityCompose,IsBinds,BeginDate,ValidDate)
values(@UserID,0,@FaceID,@CategoryID-1,1,1,@FaceColor,1,0,0,0,0,0,1,getdate(),15)

if @@error<>0
begin
  rollback tran
  return @@error
end

select @Attack=@Attack+Attack,@Defence=@Defence+Defence,@Agility=@Agility+Agility,@Luck=@Luck+Luck,@CategoryID=CategoryID from [Project_Game34].[dbo].Shop_Goods where TemplateID = @ClothID

if isnull(@CategoryID,0)=0
begin
  rollback tran
  return @@error
end

insert into Sys_Users_Goods(UserID,BagType,TemplateID,Place,[Count],IsJudge,Color,IsExist,StrengthenLevel,AttackCompose,DefendCompose,LuckCompose,AgilityCompose,IsBinds,BeginDate,ValidDate)
values(@UserID,0,@ClothID,@CategoryID-1,1,1,@ClothColor,1,0,0,0,0,0,1,getdate(),15)

if @@error<>0
begin
  rollback tran
  return @@error
end

update Sys_Users_Detail set NickName = @NickName,IsFirst = 1,Style=@style,Colors=@color,Sex=@Sex  where UserID = @UserID

if @@error<>0
begin
  rollback tran
  return @@error
end

update Sys_Users_Fight set Attack =@Attack,Defence=@Defence,Agility=@Agility,Luck=@Luck  where UserID = @UserID

if @@error<>0
begin
  rollback tran
  return @@error
end

commit tran 
set xact_abort off
return 0








GO
