-- SQL_STORED_PROCEDURE dbo.SP_UpdateNewChickenBox (modified 2021-06-26T20:19:59.923)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_UpdateNewChickenBox] 
			@ID int
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
   begin 
   IF @Position = -1
   begin
	DELETE FROM [dbo].[New_ChickenBox_Data]
      WHERE [ID] = @ID and [UserID] =@UserID 
   end
   ELSE
   begin
	UPDATE [dbo].[New_ChickenBox_Data]
	SET [TemplateID] = @TemplateID
      ,[Count] = @Count
      ,[ValidDate] = @ValidDate
      ,[StrengthenLevel] = @StrengthenLevel
      ,[AttackCompose] = @AttackCompose
      ,[DefendCompose] = @DefendCompose
      ,[AgilityCompose] = @AgilityCompose
      ,[LuckCompose] = @LuckCompose
      ,[Position] = @Position
      ,[IsSelected] = @IsSelected
      ,[IsSeeded] = @IsSeeded
      ,[IsBinds] = @IsBinds
	WHERE [ID] = @ID and [UserID] =@UserID 
	End
   return 0
   end
if(@@error <> 0)
begin
 return 1 
end

GO
