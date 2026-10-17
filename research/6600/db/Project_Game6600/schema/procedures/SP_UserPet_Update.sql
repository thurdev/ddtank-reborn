-- SQL_STORED_PROCEDURE dbo.SP_UserPet_Update (modified 2015-01-25T14:04:48.290)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<拍卖行：用户发布一个商品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_UserPet_Update]  
	@ID int, 
	@TemplateID int,
	@Name nvarchar(2000),
	@UserID int,
	@Attack int,
	@Defence int,
	@Luck int,
	@Agility int,
	@Blood int,
	@Damage int,
	@Guard int,
	@AttackGrow int,
	@DefenceGrow int,
	@LuckGrow int,
	@AgilityGrow int,
	@BloodGrow int,
	@DamageGrow int,
	@GuardGrow int,
	@Level int,
	@GP int,
	@MaxGP int,
	@Hunger int,
	@PetHappyStar int,
	@MP int,
	@IsEquip bit,
	@Place int,
	@IsExit bit,
	@Skill nvarchar(50),
	@SkillEquip nvarchar(50),
	@currentStarExp int
	
AS  
begin

UPDATE [dbo].[Sys_Users_Pet]
   SET [TemplateID] = @TemplateID
      ,[Name] = @Name
      ,[UserID] = @UserID
      ,[Attack] = @Attack
      ,[Defence] = @Defence
      ,[Luck] = @Luck
      ,[Agility] = @Agility
      ,[Blood] = @Blood
      ,[Damage] = @Damage
      ,[Guard] = @Guard
      ,[AttackGrow] = @AttackGrow
      ,[DefenceGrow] = @DefenceGrow
      ,[LuckGrow] = @LuckGrow
      ,[AgilityGrow] = @AgilityGrow
      ,[BloodGrow] = @BloodGrow
      ,[DamageGrow] = @DamageGrow
      ,[GuardGrow] = @GuardGrow
      ,[Level] = @Level
      ,[GP] = @GP
      ,[MaxGP] = @MaxGP
      ,[Hunger] = @Hunger
      ,[PetHappyStar] = @PetHappyStar
      ,[MP] = @MP
      ,[IsEquip] = @IsEquip
      ,[Place] = @Place
      ,[IsExit] = @IsExit
      ,[Skill]  = @Skill
      ,[SkillEquip]  = @SkillEquip
      ,[currentStarExp] = @currentStarExp
 WHERE [ID] = @ID and [UserID] =@UserID 
 return 0
 end
 
if(@@error <> 0)
begin
  return 1 ---Return false insert error
end

GO
