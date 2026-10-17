-- SQL_STORED_PROCEDURE dbo.SP_DiceData_Add (modified 2015-01-25T14:04:48.530)
CREATE PROCEDURE [dbo].[SP_DiceData_Add]			
            @ID int output
           ,@UserID int
           ,@LuckIntegral int
           ,@LuckIntegralLevel int
           ,@Level int
           ,@FreeCount int
           ,@CurrentPosition int
           ,@UserFirstCell bit
           ,@AwardArray nvarchar(500)
AS
BEGIN    
    INSERT INTO [dbo].[Dice_Data]
           ([UserID]
           ,[LuckIntegral]
           ,[LuckIntegralLevel]
           ,[Level]
           ,[FreeCount]
           ,[CurrentPosition]
           ,[UserFirstCell]
           ,[AwardArray])
     VALUES
           (@UserID
           ,@LuckIntegral
           ,@LuckIntegralLevel
           ,@Level
           ,@FreeCount
           ,@CurrentPosition
           ,@UserFirstCell
           ,@AwardArray)
	select @@identity as 'identity'
    set @ID=@@identity 
	return 0
	
	if(@@error <> 0)
	begin
	  return 1
	end

END

GO
