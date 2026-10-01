-- SQL_STORED_PROCEDURE dbo.SP_Users_Items_Update (modified 2022-08-17T20:57:12.787)






-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Users_Items_Update]   
  @ItemID int, 
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
 @RemoveDate datetime,
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
 @goldBeginTime datetime,
 @goldValidDate int,
 @StrengthenExp int,
 @Blood int,
 @latentEnergyCurStr nvarchar(50),
 @latentEnergyNewStr nvarchar(50),
 @latentEnergyEndTime DateTime,
 @curExp int,
 @cellLocked bit
 
 AS    
   begin 
	if (@BagType=-1 and @Place = -1 and @IsExist = 0)
	begin		
     
     DELETE FROM [dbo].[Sys_Users_Goods]
       WHERE ItemID =@ItemID
       
	end
	
    else
    
    begin
     UPDATE Sys_Users_Goods Set UserID=@UserID,BagType=@BagType, TemplateID=@TemplateID, Place=@Place, Count=@Count, IsJudge=@IsJudge, Color=@Color, IsExist=@IsExist, StrengthenLevel=@StrengthenLevel, AttackCompose=@AttackCompose, DefendCompose=@DefendCompose, LuckCompose=@LuckCompose, AgilityCompose=@AgilityCompose, IsBinds=@IsBinds, BeginDate=@BeginDate, ValidDate=@ValidDate,Skin=@Skin,IsUsed=@IsUsed,RemoveDate=@RemoveDate,RemoveType=@RemoveType,Hole1=@Hole1,Hole2=@Hole2,Hole3=@Hole3,Hole4=@Hole4,Hole5=@Hole5,Hole6=@Hole6,StrengthenTimes=@StrengthenTimes,Hole5Level=@Hole5Level,Hole5Exp=@Hole5Exp,Hole6Level=@Hole6Level,Hole6Exp=@Hole6Exp,IsGold=@IsGold,
     goldBeginTime=@goldBeginTime,
     goldValidDate=@goldValidDate,
	 StrengthenExp=@StrengthenExp,
	 Blood=@Blood,
	 latentEnergyCurStr =@latentEnergyCurStr,
     latentEnergyNewStr =@latentEnergyNewStr,
     latentEnergyEndTime = @latentEnergyEndTime,
	 curExp = @curExp,
	 cellLocked = @cellLocked
     WHERE ItemID =@ItemID
   end
end








GO
