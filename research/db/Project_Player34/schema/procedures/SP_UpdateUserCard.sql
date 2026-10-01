-- SQL_STORED_PROCEDURE dbo.SP_UpdateUserCard (modified 2021-06-04T05:18:35.900)


-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_UpdateUserCard] 
			@CardID int
           ,@UserID int
           ,@TemplateID int
           ,@Place int
           ,@Count int
           ,@Attack int
           ,@Defence int
           ,@Agility int
           ,@Luck int
           ,@Guard int
           ,@Damage int
           ,@Level int
           ,@CardGP int
		   ,@AttackReset int
		   ,@DefenceReset int
		   ,@AgilityReset int
		   ,@LuckReset int
           ,@isFirstGet bit
                      
 AS    
   begin 
UPDATE [dbo].[Sys_Users_Card]
	SET		[TemplateID] = @TemplateID
           ,[Place] = @Place
           ,[Count] = @Count
           ,[Attack] = @Attack
           ,[Defence] = @Defence
           ,[Agility] = @Agility
           ,[Luck] = @Luck
           ,[Guard] = @Guard
           ,[Damage] = @Damage
           ,[Level] = @Level
           ,[CardGP] = @CardGP
		   ,AttackReset = @AttackReset
		   ,DefenceReset = @DefenceReset
		   ,LuckReset = @LuckReset
		   ,AgilityReset = @AgilityReset
           ,[isFirstGet] = @isFirstGet
           
 WHERE [UserID] = @UserID and [CardID] = @CardID

   return 0
   end
if(@@error <> 0)
begin
 return 1 
end





GO
