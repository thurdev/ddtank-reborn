-- SQL_STORED_PROCEDURE dbo.SP_User_AdoptPet (modified 2021-12-27T04:14:43.980)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<拍卖行：用户发布一个商品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_User_AdoptPet]  
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
	@Skill nvarchar(Max),
	@SkillEquip nvarchar(Max),	
	@Place int,
	@IsExit int,
	@IsUse int,
	@ID int output 
AS  
BEGIN
 
INSERT INTO [dbo].[AdoptPetList]
           ([TemplateID]
           ,[Name]
           ,[UserID]
           ,[Attack]
           ,[Defence]
           ,[Luck]
           ,[Agility]
           ,[Blood]
           ,[Damage]
           ,[Guard]
           ,[AttackGrow]
           ,[DefenceGrow]
           ,[LuckGrow]
           ,[AgilityGrow]
           ,[BloodGrow]
           ,[DamageGrow]
           ,[GuardGrow]
           ,[Skill]
           ,[SkillEquip]           
           ,[Place]
           ,[IsExit]
           ,[IsUse])
     VALUES
           (@TemplateID
           ,@Name
           ,@UserID
           ,@Attack
           ,@Defence
           ,@Luck
           ,@Agility
           ,@Blood
           ,@Damage
           ,@Guard
           ,@AttackGrow
           ,@DefenceGrow
           ,@LuckGrow
           ,@AgilityGrow
           ,@BloodGrow
           ,@DamageGrow
           ,@GuardGrow
           ,@Skill
           ,@SkillEquip           
           ,@Place
           ,@IsExit
           ,@IsUse)
   select @@identity as 'identity'
     set @ID=@@identity    
	if(@@error <> 0)
	begin
	  return 1
	end

END


GO
