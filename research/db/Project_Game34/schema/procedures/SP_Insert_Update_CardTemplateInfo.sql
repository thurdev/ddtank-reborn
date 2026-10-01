-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_CardTemplateInfo (modified 2021-06-04T01:29:18.120)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_CardTemplateInfo]	
           @CardID int
           ,@CardType int
           ,@probability int
           ,@AttackRate int
           ,@AddAttack int
           ,@DefendRate int
           ,@AddDefend int
           ,@AgilityRate int
           ,@AddAgility int
           ,@LuckyRate int
           ,@AddLucky int
           ,@DamageRate int
           ,@AddDamage int
           ,@GuardRate int
           ,@AddGuard int        
           ,@setUpdate int
           
AS
declare @count2 int

select @count2 = isnull(count(*),0) from [dbo].[Card_Template_Info] where [CardID] = @CardID and [CardType] = @CardType
if (@count2 <> 0 and @setUpdate = 0)
begin

UPDATE [dbo].[Card_Template_Info]
   SET [CardID] = @CardID
      ,[CardType] = @CardType
      ,[probability] = @probability
      ,[AttackRate] = @AttackRate
      ,[AddAttack] = @AddAttack
      ,[DefendRate] = @DefendRate
      ,[AddDefend] = @AddDefend
      ,[AgilityRate] = @AgilityRate
      ,[AddAgility] = @AddAgility
      ,[LuckyRate] = @LuckyRate
      ,[AddLucky] = @AddLucky
      ,[DamageRate] = @DamageRate
      ,[AddDamage] = @AddDamage
      ,[GuardRate] = @GuardRate
      ,[AddGuard] = @AddGuard
 WHERE [CardID] = @CardID and [CardType] = @CardType
 
return 1 
 end
else 
begin

INSERT INTO [dbo].[Card_Template_Info]
           ([CardID]
           ,[CardType]
           ,[probability]
           ,[AttackRate]
           ,[AddAttack]
           ,[DefendRate]
           ,[AddDefend]
           ,[AgilityRate]
           ,[AddAgility]
           ,[LuckyRate]
           ,[AddLucky]
           ,[DamageRate]
           ,[AddDamage]
           ,[GuardRate]
           ,[AddGuard])
     VALUES
           (@CardID
           ,@CardType
           ,@probability
           ,@AttackRate
           ,@AddAttack
           ,@DefendRate
           ,@AddDefend
           ,@AgilityRate
           ,@AddAgility
           ,@LuckyRate
           ,@AddLucky
           ,@DamageRate
           ,@AddDamage
           ,@GuardRate
           ,@AddGuard )
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
