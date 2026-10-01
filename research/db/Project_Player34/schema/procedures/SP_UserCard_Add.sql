-- SQL_STORED_PROCEDURE dbo.SP_UserCard_Add (modified 2021-06-04T05:18:35.983)


CREATE PROCEDURE [dbo].[SP_UserCard_Add]			
            @CardID int output
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
BEGIN
    -- Insert statements for procedure here
    INSERT INTO [dbo].[Sys_Users_Card]
           ([UserID]
           ,[TemplateID]
           ,[Place]
           ,[Count]
           ,[Attack]
           ,[Defence]
           ,[Agility]
           ,[Luck]
           ,[Guard]
           ,[Damage]
           ,[Level]
           ,[CardGP]
		   ,[AttackReset]
		   ,[DefenceReset]
		   ,[LuckReset]
		   ,[AgilityReset]
           ,[isFirstGet])
     VALUES
           (@UserID
           ,@TemplateID
           ,@Place
           ,@Count
           ,@Attack
           ,@Defence
           ,@Agility
           ,@Luck
           ,@Guard
           ,@Damage
           ,@Level
           ,@CardGP
		   ,@AttackReset
		   ,@DefenceReset
		   ,@LuckReset
		   ,@AgilityReset
           ,@isFirstGet)
	select @@identity as 'identity'
    set @CardID=@@identity 
	return 0
	
	if(@@error <> 0)
	begin
	  return 1
	end

END





GO
