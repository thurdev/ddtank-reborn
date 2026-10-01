-- SQL_STORED_PROCEDURE dbo.SP_Users_Items_Add (modified 2022-08-17T20:56:50.363)






-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：用户新增一个物品>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_Items_Add]   
 @ItemID int output, 
 @UserID int, 
 @TemplateID int, 
 @Place int, 
 @Count int, 
 @IsJudge bit, 
 @Color nvarchar(100), 
 @IsExist bit, 
 @StrengthenLevel int, 
 @AttackCompose int, 
 @DefendCompose int, 
 @LuckCompose int, 
 @AgilityCompose int, 
 @IsBinds bit, 
 @BeginDate DateTime, 
 @ValidDate int,
 @BagType int,
 @Skin nvarchar(50),
 @IsUsed bit,
 @RemoveType int,
 @Hole1 int,
 @Hole2 int,
 @Hole3 int,
 @Hole4 int,
 @Hole5 int,
 @Hole6 int,
 @StrengthenTimes int,
 @Hole5Level int,
 @Hole5Exp int,
 @Hole6Level int,
 @Hole6Exp int,
 @IsGold bit, 
 @goldValidDate int,
 @StrengthenExp int,
 @goldBeginTime DateTime,
 @Blood int,
 @latentEnergyCurStr nvarchar(50),
 @latentEnergyNewStr nvarchar(50),
 @latentEnergyEndTime DateTime,
 @curExp int,
 @cellLocked bit
AS  
declare  @temp int
select @temp = count(*) from Sys_Users_Goods where ItemID=@ItemID
if @temp=0 
 begin 
	/*if @Place>-1
	begin
		update Sys_Users_Goods set Place=-2 where UserID=@UserID and BagType=@BagType and Place=@Place and IsExist=1
	end*/

     INSERT INTO Sys_Users_Goods( UserID, BagType,TemplateID, Place, Count, IsJudge, Color, IsExist, StrengthenLevel, AttackCompose, DefendCompose, LuckCompose, AgilityCompose, IsBinds, BeginDate, ValidDate,Skin,IsUsed,RemoveType,Hole1,Hole2,Hole3,Hole4,Hole5,Hole6,StrengthenTimes,Hole5Level,Hole5Exp,Hole6Level,Hole6Exp,IsGold,
	 goldBeginTime,
	 goldValidDate,
	 StrengthenExp,
	 Blood,
	 latentEnergyCurStr,
	 latentEnergyNewStr,
	 latentEnergyEndTime,
	 curExp,
	 cellLocked) 
     VALUES( @UserID, @BagType,@TemplateID, @Place, @Count, @IsJudge, @Color, @IsExist, @StrengthenLevel, @AttackCompose, @DefendCompose, @LuckCompose, @AgilityCompose, @IsBinds, @BeginDate, @ValidDate,@Skin,@IsUsed,@RemoveType,@Hole1,@Hole2,@Hole3,@Hole4,@Hole5,@Hole6,@StrengthenTimes, @Hole5Level, @Hole5Exp, @Hole6Level, @Hole6Exp, @IsGold, 
     @goldBeginTime, 
     @goldValidDate, 
     @StrengthenExp,
	 @Blood,
	 @latentEnergyCurStr,
	 @latentEnergyNewStr,
	 @latentEnergyEndTime,
	 @curExp,
	 @cellLocked)
     
     select @@identity as 'identity'
     set @ItemID=@@identity    
 end









GO
