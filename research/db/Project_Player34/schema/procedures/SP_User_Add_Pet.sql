-- SQL_STORED_PROCEDURE dbo.SP_User_Add_Pet (modified 2021-12-27T04:16:33.070)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<拍卖行：用户发布一个商品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_User_Add_Pet]  
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
	@Skill nvarchar(Max),
	@SkillEquip nvarchar(Max),	
	@Place int,
	@IsExit int,
	@ID int output,
	@currentStarExp int
	,@breakGrade int 
    ,@breakAttack int 
    ,@breakDefence int 
    ,@breakAgility int 
    ,@breakLuck int 
    ,@breakBlood int 
	,@eQPets nvarchar(MAX) 
	,@BaseProp nvarchar(MAX) 
AS  

BEGIN 
INSERT INTO [dbo].[Sys_Users_Pet]
           ([TemplateID],[Name],[UserID],[Attack],[Defence],[Luck],[Agility],[Blood]
           ,[Damage],[Guard],[AttackGrow],[DefenceGrow],[LuckGrow],[AgilityGrow],[BloodGrow]
           ,[DamageGrow],[GuardGrow],[Level],[GP],[MaxGP],[Hunger],[PetHappyStar],[MP]
           ,[IsEquip],[Place],[IsExit],[Skill],[SkillEquip],[currentStarExp],[breakGrade]
          ,[breakAttack]
          ,[breakDefence]
          ,[breakAgility]
          ,[breakLuck]
          ,[breakBlood]
		  ,[eQPets]
		  ,[BaseProp])
     VALUES
           (@TemplateID,@Name,@UserID,@Attack,@Defence,@Luck,@Agility,@Blood
           ,@Damage,@Guard,@AttackGrow,@DefenceGrow,@LuckGrow,@AgilityGrow,@BloodGrow
           ,@DamageGrow,@GuardGrow,@Level,@GP,@MaxGP,@Hunger,@PetHappyStar,@MP
           ,@IsEquip,@Place,@IsExit,@Skill,@SkillEquip,@currentStarExp,@breakGrade 
           ,@breakAttack 
           ,@breakDefence 
           ,@breakAgility 
           ,@breakLuck 
           ,@breakBlood
		   ,@eQPets
		   ,@BaseProp)   

	 select @@identity as 'identity'
     set @ID=@@identity        
  end

  /* declare @PetID int
     SET @PetID = @ID
     INSERT INTO [dbo].[AdoptPetList]
           ([PetID],[TemplateID],[Name],[UserID]
           ,[Attack],[Defence],[Luck],[Agility],[Blood],[Damage],[Guard]
           ,[AttackGrow],[DefenceGrow],[LuckGrow] ,[AgilityGrow],[BloodGrow],[DamageGrow] ,[GuardGrow]
           ,[Skill],[SkillEquip],[Place],[IsExit],[IsUse])
     VALUES
           (@PetID,@TemplateID,@Name,@UserID
           ,@Attack,@Defence,@Luck,@Agility,@Blood,@Damage,@Guard
           ,@AttackGrow,@DefenceGrow,@LuckGrow,@AgilityGrow,@BloodGrow,@DamageGrow,@GuardGrow
           ,@Skill,@SkillEquip,@Place,0,1)	
	*/

	if(@@error <> 0)
	begin	
	  return 1
	end




GO
