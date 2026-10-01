-- SQL_STORED_PROCEDURE dbo.SP_NewChickenBox_Add (modified 2021-06-26T20:20:18.077)
CREATE PROCEDURE [dbo].[SP_NewChickenBox_Add]			
            @ID int output
           ,@UserID int
           ,@TemplateID int
           ,@Count int
           ,@ValidDate int
           ,@StrengthenLevel int
           ,@AttackCompose int
           ,@DefendCompose int
           ,@AgilityCompose int
           ,@LuckCompose int
           ,@Position int
           ,@IsSelected bit
           ,@IsSeeded bit
           ,@IsBinds bit
AS
BEGIN    
    INSERT INTO [dbo].[New_ChickenBox_Data]
           ([UserID]
           ,[TemplateID]
           ,[Count]
           ,[ValidDate]
           ,[StrengthenLevel]
           ,[AttackCompose]
           ,[DefendCompose]
           ,[AgilityCompose]
           ,[LuckCompose]
           ,[Position]
           ,[IsSelected]
           ,[IsSeeded]
           ,[IsBinds])
     VALUES
           (@UserID
           ,@TemplateID
           ,@Count
           ,@ValidDate
           ,@StrengthenLevel
           ,@AttackCompose
           ,@DefendCompose
           ,@AgilityCompose
           ,@LuckCompose
           ,@Position
           ,@IsSelected
           ,@IsSeeded
           ,@IsBinds)
	select @@identity as 'identity'
    set @ID=@@identity 
	return 0
	
	if(@@error <> 0)
	begin
	  return 1
	end

END

GO
